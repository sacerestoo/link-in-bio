import "server-only";
import { createDatabase } from "@grabbin/db";
import { findOwnedPageId } from "@grabbin/db/repositories/page";
import {
  bentoMediaUploadRequestSchema,
  bentoMediaUploadResponseSchema,
} from "@grabbin/domain/bento";
import { handleSchema } from "@grabbin/domain/page";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ServerBindings } from "../lib/env";
import { requireSession } from "../middleware/session.middleware";
import { BentoMediaService } from "../services/bento-media.service";
import { withDomainErrors } from "./domain-route-errors";

export const bentoMediaRoute = new Hono<{
  Bindings: ServerBindings;
}>().post(
  "/:handle/bento-media-upload",
  requireSession,
  sValidator("param", v.object({ handle: handleSchema }), (result) => {
    if (!result.success)
      throw new HTTPException(400, {
        message: result.error.map((issue) => issue.message).join(" "),
      });
  }),
  sValidator("json", bentoMediaUploadRequestSchema, (result) => {
    if (!result.success)
      throw new HTTPException(400, {
        message: result.error.map((issue) => issue.message).join(" "),
      });
  }),
  (c) =>
    withDomainErrors(async () => {
      const { handle } = c.req.valid("param");
      const userId = c.get("session").user.id;
      const database = createDatabase(c.env.HYPERDRIVE.connectionString);
      const pageId = await findOwnedPageId(database, userId, handle);
      if (pageId === undefined)
        throw new HTTPException(404, { message: "Page not found" });

      const mediaService = new BentoMediaService(database, c.env, c.req.url);
      return c.json(
        v.parse(
          bentoMediaUploadResponseSchema,
          await mediaService.createUpload(pageId, c.req.valid("json")),
        ),
      );
    }),
);
