import { DurableObject } from "cloudflare:workers";
import { readServerEnv, type ServerBindings } from "./env";
import { decryptToken, encryptToken, fingerprint } from "./token-crypto";

export type ManagedProvider = "twitch";
export type TokenStatus = "active" | "refresh_failed" | "reauth_required";

export interface ProviderAccessToken {
  accessToken: string;
  clientId?: string;
}

interface StoredCredential {
  provider: ManagedProvider;
  ciphertext?: number[];
  iv?: number[];
  credentialFingerprint: string;
  expiresAt: number | null;
  status: TokenStatus;
  lastRefreshedAt: number | null;
  updatedAt: number;
}

const storageKey = "provider-credential";
const refreshMarginMs = 120_000;
const tokenUrl = "https://id.twitch.tv/oauth2/token";

export class TokenManager extends DurableObject<ServerBindings> {
  private refreshPromise: Promise<ProviderAccessToken> | undefined;

  private get settings() {
    return readServerEnv(this.env);
  }

  async getAccessToken(providerValue: string): Promise<ProviderAccessToken> {
    if (providerValue !== "twitch")
      throw new Error("Only Twitch credentials are managed by this object.");

    const provider: ManagedProvider = "twitch";
    const stored = await this.ctx.storage.get<StoredCredential>(storageKey);

    const clientId = this.settings.TWITCH_CLIENT_ID?.trim() ?? "";
    const clientSecret = this.settings.TWITCH_CLIENT_SECRET?.trim() ?? "";
    if (!clientId || !clientSecret) {
      await this.saveStatus(provider, stored, "reauth_required", null);
      throw new Error("Twitch credentials are not configured.");
    }

    const credentialFingerprint = await fingerprint(
      `${clientId}:${clientSecret}`,
    );
    const current =
      stored?.provider === provider &&
      stored.credentialFingerprint === credentialFingerprint
        ? stored
        : undefined;
    if (current?.status === "reauth_required")
      throw new Error("Twitch credentials require reauthentication.");

    if (
      current?.status === "active" &&
      current.expiresAt !== null &&
      current.expiresAt > Date.now() + refreshMarginMs
    ) {
      const accessToken = await this.decryptCredential(current);
      return { accessToken, clientId };
    }

    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.issueTwitchToken(
      clientId,
      clientSecret,
      credentialFingerprint,
      current,
    );
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = undefined;
    }
  }

  async invalidateAccessToken(
    providerValue: string,
    staleAccessToken: string,
  ): Promise<void> {
    if (providerValue !== "twitch" || staleAccessToken.length === 0) return;
    const stored = await this.ctx.storage.get<StoredCredential>(storageKey);
    if (!stored?.ciphertext || !stored.iv) return;
    if ((await this.decryptCredential(stored)) !== staleAccessToken) return;
    await this.ctx.storage.delete(storageKey);
  }

  async markReauthenticationRequired(
    providerValue: string,
    staleAccessToken: string,
  ): Promise<void> {
    if (providerValue !== "twitch" || staleAccessToken.length === 0) return;
    const stored = await this.ctx.storage.get<StoredCredential>(storageKey);
    if (!stored?.ciphertext || !stored.iv) return;
    if ((await this.decryptCredential(stored)) !== staleAccessToken) return;
    await this.saveStatus(
      providerValue,
      stored,
      "reauth_required",
      stored.credentialFingerprint,
    );
  }

  private async issueTwitchToken(
    clientId: string,
    clientSecret: string,
    credentialFingerprint: string,
    previous: StoredCredential | undefined,
  ): Promise<ProviderAccessToken> {
    let response: Response;
    try {
      response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      });
    } catch {
      await this.saveStatus(
        "twitch",
        previous,
        "refresh_failed",
        credentialFingerprint,
      );
      throw new Error("Twitch token service is unavailable.");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      await this.saveStatus(
        "twitch",
        previous,
        "refresh_failed",
        credentialFingerprint,
      );
      throw new Error("Twitch returned an invalid token response.");
    }
    if (!response.ok) {
      const status: TokenStatus =
        response.status === 400 || response.status === 401
          ? "reauth_required"
          : "refresh_failed";
      await this.saveStatus("twitch", previous, status, credentialFingerprint);
      throw new Error("Twitch token renewal failed.");
    }
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("access_token" in payload) ||
      typeof payload.access_token !== "string" ||
      payload.access_token.length === 0 ||
      !("expires_in" in payload) ||
      typeof payload.expires_in !== "number" ||
      !Number.isFinite(payload.expires_in) ||
      payload.expires_in <= 0
    ) {
      await this.saveStatus(
        "twitch",
        previous,
        "refresh_failed",
        credentialFingerprint,
      );
      throw new Error("Twitch returned an invalid token response.");
    }

    await this.storeToken(
      "twitch",
      payload.access_token,
      Date.now() + payload.expires_in * 1000,
      credentialFingerprint,
    );
    return { accessToken: payload.access_token, clientId };
  }

  private async storeToken(
    provider: ManagedProvider,
    accessToken: string,
    expiresAt: number | null,
    credentialFingerprint: string,
  ): Promise<void> {
    const encrypted = await encryptToken(this.encryptionSecret(), accessToken);
    const now = Date.now();
    await this.ctx.storage.put<StoredCredential>(storageKey, {
      provider,
      ...encrypted,
      credentialFingerprint,
      expiresAt,
      status: "active",
      lastRefreshedAt: now,
      updatedAt: now,
    });
  }

  private async saveStatus(
    provider: ManagedProvider,
    previous: StoredCredential | undefined,
    status: TokenStatus,
    credentialFingerprint: string | null,
  ): Promise<void> {
    if (status === "reauth_required") {
      // eslint-disable-next-line no-warning-comments -- Alerting is deferred by request.
      // TODO: Notify an administrator when a provider needs reauthentication.
    }
    await this.ctx.storage.put<StoredCredential>(storageKey, {
      provider,
      ...(previous?.ciphertext ? { ciphertext: previous.ciphertext } : {}),
      ...(previous?.iv ? { iv: previous.iv } : {}),
      credentialFingerprint:
        credentialFingerprint ?? previous?.credentialFingerprint ?? "",
      expiresAt: previous?.expiresAt ?? null,
      status,
      lastRefreshedAt: previous?.lastRefreshedAt ?? null,
      updatedAt: Date.now(),
    });
  }

  private decryptCredential(credential: StoredCredential): Promise<string> {
    if (!credential.ciphertext || !credential.iv)
      throw new Error("Provider credential is unavailable.");
    return decryptToken(this.encryptionSecret(), {
      ciphertext: credential.ciphertext,
      iv: credential.iv,
    });
  }

  private encryptionSecret(): string {
    const secret = this.settings.TOKEN_ENCRYPTION_KEY;
    if (secret === undefined)
      throw new Error("The token encryption key is not configured.");
    return secret;
  }
}
