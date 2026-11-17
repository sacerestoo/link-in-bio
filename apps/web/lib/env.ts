import * as v from "valibot";
import { webEnvSchema } from "./env-schema";

export type WebEnv = v.InferOutput<typeof webEnvSchema>;

export const readWebEnv = (bindings: Readonly<object>): WebEnv =>
  v.parse(webEnvSchema, bindings);

export const getWebEnv = async (): Promise<WebEnv> =>
  readWebEnv((await import("cloudflare:workers")).env);

export const getServerBinding = async () =>
  (await import("cloudflare:workers")).env.SERVER;
