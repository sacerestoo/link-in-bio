import "server-only";
import { createDatabase } from "@grabbin/db";
import {
  renewPendingBentoMediaUpload,
  reserveBentoMediaUpload,
} from "@grabbin/db/repositories/bento-media";
import { findOwnedPageId, PageError } from "@grabbin/db/repositories/page";
import {
  bentoMediaUploadRequestSchema,
  bentoMediaUploadResponseSchema,
  BentoMediaError,
  isBentoMediaObjectKeyForPage,
} from "@grabbin/domain/bento-media";
import { handleSchema } from "@grabbin/domain/page";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ServerBindings } from "../env";
import { inspectBentoMediaObject } from "../bento-media";
import { withDomainErrors } from "../domain-error";
import { requireSession } from "../middleware";
import { signR2Request } from "../r2";

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
        throw new PageError("not-found", "Page not found");

      const request = c.req.valid("json");
      const asset = await reserveBentoMediaUpload(
        database,
        request.uploadId,
        pageId,
      );
      if (!isBentoMediaObjectKeyForPage(asset.objectKey, pageId))
        throw new BentoMediaError(
          "media-upload-page-conflict",
          "This media upload ID belongs to another page.",
        );
      if (asset.status === "pending_delete")
        throw new BentoMediaError(
          "media-upload-expired",
          "This media upload has expired. Choose the file again.",
        );

      const inspection = await inspectBentoMediaObject(
        c.env,
        c.req.url,
        asset.objectKey,
      );
      if (inspection === "uploaded")
        return c.json(
          v.parse(bentoMediaUploadResponseSchema, {
            status: "uploaded",
            objectKey: asset.objectKey,
          }),
        );
      if (asset.status !== "pending")
        throw new BentoMediaError(
          "saved-media-missing",
          "The saved image is missing from storage.",
        );

      const renewedAsset = await renewPendingBentoMediaUpload(
        database,
        request.uploadId,
      );
      if (renewedAsset === undefined)
        throw new BentoMediaError(
          "media-upload-expired",
          "This media upload has expired. Choose the file again.",
        );

      const uploadUrl = await signR2Request(
        c.env,
        c.req.url,
        "PUT",
        renewedAsset.objectKey,
        {
          "Content-Type": request.contentType,
          "If-None-Match": "*",
        },
      );
      if (uploadUrl === null)
        throw new BentoMediaError(
          "media-upload-unavailable",
          "Image uploads are unavailable.",
        );

      return c.json(
        v.parse(bentoMediaUploadResponseSchema, {
          status: "pending",
          objectKey: renewedAsset.objectKey,
          uploadUrl,
        }),
      );
    }),
);
