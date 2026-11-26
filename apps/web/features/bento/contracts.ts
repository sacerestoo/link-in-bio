import { bentoMediaUploadResponseSchema } from "@grabbin/shared/schemas/bento-media";
import * as v from "valibot";

export const bentoMediaUploadResponseContract = v.pipe(
  bentoMediaUploadResponseSchema,
  v.transform((response) => response),
);
