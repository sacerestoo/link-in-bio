import * as v from "valibot";
import providerRules from "./provider-targets.json";

const pathRuleSchema = v.strictObject({
  pathPattern: v.string(),
  captureNames: v.array(v.string()),
  queryParameter: v.nullable(v.string()),
  queryParameterName: v.nullable(v.string()),
  queryParameterPattern: v.nullable(v.string()),
  requiresHostParam: v.nullable(v.boolean()),
  hostPatterns: v.array(v.string()),
  staticParams: v.record(v.string(), v.string()),
});

const targetRuleSchema = v.strictObject({
  target: v.string(),
  matchAny: v.boolean(),
  rules: v.array(pathRuleSchema),
});

const providerRuleSchema = v.strictObject({
  provider: v.string(),
  hosts: v.array(v.string()),
  hostParam: v.nullable(v.string()),
  targets: v.array(targetRuleSchema),
  defaultTarget: v.nullable(v.string()),
});

const providerRuleSetSchema = v.strictObject({
  version: v.number(),
  providers: v.array(providerRuleSchema),
  fallback: providerRuleSchema,
});

type TargetRule = v.InferOutput<typeof targetRuleSchema>;
type ProviderRule = v.InferOutput<typeof providerRuleSchema>;

type HostMatch = {
  specificity: number;
  params: Record<string, string>;
};

export type ResolvedTarget = {
  normalizedUrl: string;
  provider: string;
  target: string;
  params: Record<string, string>;
};

export class TargetResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TargetResolutionError";
  }
}

const rules = v.parse(providerRuleSetSchema, providerRules);

const normalizeUrl = (value: unknown): URL => {
  if (typeof value !== "string" || value.trim() === "")
    throw new TargetResolutionError("Please provide a URL.");

  const input = value.trim();
  if (input.length > 2048)
    throw new TargetResolutionError("URL must be 2,048 characters or fewer.");
  for (const character of input) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 32 || code === 127)
      throw new TargetResolutionError("The URL contains invalid characters.");
  }

  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new TargetResolutionError("Please check the URL format.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new TargetResolutionError("Only HTTP or HTTPS URLs are allowed.");
  if (!url.hostname || url.username !== "" || url.password !== "")
    throw new TargetResolutionError(
      "The URL must include a hostname and must not contain user information.",
    );
  if (url.port !== "")
    throw new TargetResolutionError(
      "Only standard web ports (80 and 443) are allowed.",
    );

  url.hostname = url.hostname.toLowerCase().replace(/\.$/u, "");
  url.hash = "";
  return url;
};

const matchHostPattern = (host: string, pattern: string): HostMatch | null => {
  if (pattern === "*") return { specificity: 0, params: {} };

  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    if (!host.endsWith(suffix)) return null;
    const subdomain = host.slice(0, -suffix.length);
    if (subdomain === "") return null;
    return { specificity: suffix.length, params: { subdomain } };
  }

  return host === pattern ? { specificity: pattern.length, params: {} } : null;
};

const matchProviderHost = (
  provider: ProviderRule,
  host: string,
): HostMatch | null => {
  const matches = provider.hosts.flatMap((pattern) => {
    const match = matchHostPattern(host, pattern);
    if (match === null) return [];
    const params =
      provider.hostParam !== null && match.params.subdomain
        ? { [provider.hostParam]: match.params.subdomain }
        : {};
    return [{ specificity: match.specificity, params }];
  });
  return matches.reduce<HostMatch | null>(
    (best, match) =>
      best === null || match.specificity > best.specificity ? match : best,
    null,
  );
};

const decodeParam = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const matchTarget = (
  target: TargetRule,
  url: URL,
  hostParams: Record<string, string>,
): Record<string, string> | null => {
  if (target.matchAny) return {};

  for (const rule of target.rules) {
    const hasHostParams = Object.keys(hostParams).length > 0;
    if (rule.requiresHostParam === true && !hasHostParams) continue;
    if (rule.requiresHostParam === false && hasHostParams) continue;
    if (
      rule.hostPatterns.length > 0 &&
      !rule.hostPatterns.some(
        (pattern) => matchHostPattern(url.hostname, pattern) !== null,
      )
    )
      continue;

    const match = new RegExp(`^(?:${rule.pathPattern})$`, "u").exec(
      url.pathname || "/",
    );
    if (match === null) continue;

    const params = Object.fromEntries(
      rule.captureNames.flatMap((name, index) => {
        const value = match[index + 1];
        return value === undefined ? [] : [[name, decodeParam(value)]];
      }),
    );
    Object.assign(params, rule.staticParams);

    if (rule.queryParameter !== null) {
      const value = url.searchParams.getAll(rule.queryParameter)[0] ?? "";
      if (value === "") continue;
      if (
        rule.queryParameterPattern !== null &&
        !new RegExp(`^(?:${rule.queryParameterPattern})$`, "u").test(value)
      )
        continue;
      params[rule.queryParameterName ?? rule.queryParameter] = value;
    }

    return params;
  }

  return null;
};

const resolveForProvider = (
  provider: ProviderRule,
  url: URL,
  hostMatch: HostMatch,
): ResolvedTarget | null => {
  for (const target of provider.targets) {
    const params = matchTarget(target, url, hostMatch.params);
    if (params !== null)
      return {
        normalizedUrl: url.href,
        provider: provider.provider,
        target: target.target,
        params: { ...hostMatch.params, ...params },
      };
  }

  if (provider.defaultTarget === null) return null;
  const defaultTarget = providerRules.fallback.targets.find(
    (target) => target.target === provider.defaultTarget,
  );
  if (defaultTarget === undefined) return null;
  const params = matchTarget(defaultTarget, url, hostMatch.params);
  if (params === null) return null;

  return {
    normalizedUrl: url.href,
    provider: provider.provider,
    target: defaultTarget.target,
    params: { ...hostMatch.params, ...params },
  };
};

export const resolveTarget = (value: unknown): ResolvedTarget => {
  const url = normalizeUrl(value);
  const candidates = rules.providers.flatMap((provider, index) => {
    const hostMatch = matchProviderHost(provider, url.hostname);
    return hostMatch === null ? [] : [{ provider, hostMatch, index }];
  });
  candidates.sort(
    (left, right) =>
      right.hostMatch.specificity - left.hostMatch.specificity ||
      left.index - right.index,
  );

  for (const { provider, hostMatch } of candidates) {
    const match = resolveForProvider(provider, url, hostMatch);
    if (match !== null) return match;
  }

  const fallbackHostMatch = matchProviderHost(rules.fallback, url.hostname);
  if (fallbackHostMatch === null)
    throw new TargetResolutionError("The URL could not be matched.");
  const fallback = resolveForProvider(rules.fallback, url, fallbackHostMatch);
  if (fallback === null)
    throw new TargetResolutionError("The URL could not be matched.");
  return fallback;
};
