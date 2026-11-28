import "server-only";
import { resolveTarget, TargetResolutionError } from "@grabbin/contracts";
import {
  metadataRequestSchema,
  scrapperMetadataRequestSchema,
} from "@grabbin/contracts/metadata";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import { readServerEnv, type ServerBindings } from "../env";
import { requireSessionUnlessDevelopment } from "../middleware";

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
    const scrapperUrl = serverEnv.SCRAPPER_API_URL;
    const scrapperToken = serverEnv.SCRAPPER_API_TOKEN;
    if (scrapperUrl === undefined || scrapperToken === undefined)
      throw new HTTPException(503, {
        message: "Metadata extraction is unavailable.",
      });

    const scrapperRequest = v.parse(scrapperMetadataRequestSchema, {
      url: request.url,
      provider: route.provider,
      target: route.target,
      mode: request.mode,
    });

    let response: Response;
    try {
      response = await fetch(scrapperUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${scrapperToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scrapperRequest),
      });
    } catch {
      throw new HTTPException(502, {
        message: "Metadata extraction is unavailable.",
      });
    }

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
