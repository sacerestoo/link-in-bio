import * as v from "valibot";

export const metadataRequestSchema = v.strictObject({
  url: v.pipe(v.string(), v.minLength(1), v.maxLength(2048)),
  mode: v.optional(v.picklist(["fetcher", "session"]), "fetcher"),
});

export type MetadataRequest = v.InferOutput<typeof metadataRequestSchema>;

export const scrapperMetadataRequestSchema = v.strictObject({
  url: v.pipe(v.string(), v.minLength(1), v.maxLength(2048)),
  provider: v.pipe(v.string(), v.minLength(1)),
  target: v.pipe(v.string(), v.minLength(1)),
  mode: v.picklist(["fetcher", "session"]),
  accessToken: v.optional(
    v.pipe(v.string(), v.minLength(1), v.maxLength(4096)),
  ),
  clientId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(256))),
});

export type ScrapperMetadataRequest = v.InferOutput<
  typeof scrapperMetadataRequestSchema
>;
