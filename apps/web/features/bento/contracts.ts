import { bentoMediaUploadResponseSchema } from "@grabbin/domain/bento-media";
import * as v from "valibot";

export const bentoMediaUploadResponseContract = v.pipe(
  bentoMediaUploadResponseSchema,
  v.transform((response) => response),
);
