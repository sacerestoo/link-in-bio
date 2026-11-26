import { bentoMediaUploadResponseSchema } from "@grabbin/domain/bento";
import * as v from "valibot";

export const bentoMediaUploadResponseContract = v.pipe(
  bentoMediaUploadResponseSchema,
  v.transform((response) => response),
);
