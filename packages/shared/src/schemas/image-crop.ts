import * as v from "valibot";

export const imageCropSchema = v.pipe(
  v.object({
    x: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    y: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    width: v.pipe(v.number(), v.minValue(0.1), v.maxValue(100)),
    height: v.pipe(v.number(), v.minValue(0.1), v.maxValue(100)),
  }),
  v.check(
    (crop) => crop.x + crop.width <= 100 && crop.y + crop.height <= 100,
    "Crop must stay within the image bounds.",
  ),
);

export type ImageCrop = v.InferOutput<typeof imageCropSchema>;
