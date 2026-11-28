import "server-only";
import { resolveTarget, TargetResolutionError } from "@grabbin/contracts";
import {
  metadataRequestSchema,
  scrapperMetadataRequestSchema,
  type MetadataRequest,
} from "@grabbin/contracts/metadata";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ProviderAccessToken } from "../token-manager";
import { readServerEnv, type ServerBindings, type ServerEnv } from "../env";
import { requireSessionUnlessDevelopment } from "../middleware";

type TokenManagerStub = ReturnType<
  ServerBindings["TOKEN_MANAGER"]["getByName"]
>;

interface ScrapperRequest {
  url: string;
  provider: string;
  target: string;
  mode: MetadataRequest["mode"];
}

const targetStatus = (response: Response): number | undefined => {
  if (response.status !== 502) return undefined;
  const rawStatus = response.headers.get("x-upstream-status");
  if (rawStatus === null || !/^\d{3}$/u.test(rawStatus)) return undefined;
  return Number(rawStatus);
};

async function postToScrapper(
  serverEnv: ServerEnv,
  request: ScrapperRequest,
  token: ProviderAccessToken | undefined,
): Promise<Response> {
  const scrapperUrl = serverEnv.SCRAPPER_API_URL;
  const scrapperToken = serverEnv.SCRAPPER_API_TOKEN;
  if (scrapperUrl === undefined || scrapperToken === undefined)
    throw new HTTPException(503, {
      message: "Metadata extraction is unavailable.",
    });

  const body = v.parse(scrapperMetadataRequestSchema, {
    ...request,
    ...(token ? { accessToken: token.accessToken } : {}),
    ...(token?.clientId === undefined ? {} : { clientId: token.clientId }),
  });
  try {
    return await fetch(scrapperUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${scrapperToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new HTTPException(502, {
      message: "Metadata extraction is unavailable.",
    });
  }
}

async function getManagedToken(
  tokenManager: TokenManagerStub,
  provider: string,
): Promise<ProviderAccessToken> {
  try {
    return await tokenManager.getAccessToken(provider);
  } catch {
    throw new HTTPException(503, {
      message: "Provider authentication is unavailable.",
    });
  }
}

async function markReauthenticationRequired(
  tokenManager: TokenManagerStub,
  provider: string,
  accessToken: string,
): Promise<void> {
  try {
    await tokenManager.markReauthenticationRequired(provider, accessToken);
  } catch {
    // Preserve the Scrapper response when status recording is unavailable.
  }
}

async function retryUnauthorizedProvider(
  tokenManager: TokenManagerStub,
  request: ScrapperRequest,
  serverEnv: ServerEnv,
  provider: string,
  accessToken: ProviderAccessToken,
  response: Response,
): Promise<Response> {
  if (targetStatus(response) !== 401) return response;

  let currentToken = accessToken;
  let retryResponse = response;
  if (provider === "twitch") {
    try {
      await tokenManager.invalidateAccessToken(
        provider,
        currentToken.accessToken,
      );
      currentToken = await getManagedToken(tokenManager, provider);
      retryResponse = await postToScrapper(serverEnv, request, currentToken);
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(503, {
        message: "Provider authentication is unavailable.",
      });
    }
  }

  if (targetStatus(retryResponse) === 401)
    await markReauthenticationRequired(
      tokenManager,
      provider,
      currentToken.accessToken,
    );
  return retryResponse;
}

export const metadataRoute = new Hono<{
  Bindings: ServerBindings;
}>().get(
  "/",
  requireSessionUnlessDevelopment,
  sValidator("query", metadataRequestSchema, (result) => {
    if (!result.success)
      throw new HTTPException(400, {
        message: result.error.map((issue) => issue.message).join(" "),
      });
  }),
  async (c) => {
    const request = c.req.valid("query");
    let route: ReturnType<typeof resolveTarget>;
    try {
      route = resolveTarget(request.url);
    } catch (error) {
      if (error instanceof TargetResolutionError)
        throw new HTTPException(400, { message: error.message });
      throw error;
    }

    const serverEnv = readServerEnv(c.env);
    if (
      serverEnv.SCRAPPER_API_URL === undefined ||
      serverEnv.SCRAPPER_API_TOKEN === undefined
    )
      throw new HTTPException(503, {
        message: "Metadata extraction is unavailable.",
      });

    const scrapperRequest: ScrapperRequest = {
      url: request.url,
      provider: route.provider,
      target: route.target,
      mode: request.mode,
    };
    const tokenManager =
      route.provider === "twitch"
        ? c.env.TOKEN_MANAGER.getByName(route.provider, {
            locationHint: "apac-se",
          })
        : undefined;
    let accessToken: ProviderAccessToken | undefined;
    if (tokenManager)
      accessToken = await getManagedToken(tokenManager, route.provider);

    let response = await postToScrapper(
      serverEnv,
      scrapperRequest,
      accessToken,
    );
    if (tokenManager && accessToken)
      response = await retryUnauthorizedProvider(
        tokenManager,
        scrapperRequest,
        serverEnv,
        route.provider,
        accessToken,
        response,
      );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  },
);
