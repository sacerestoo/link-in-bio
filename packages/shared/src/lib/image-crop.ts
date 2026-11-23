import type { ImageCrop } from "../schemas/image-crop";

export type ImageDimensions = Readonly<{ width: number; height: number }>;

const hasDimensions = ({ width, height }: ImageDimensions) =>
  width > 0 && height > 0;

export const getCenteredCrop = (
  source: ImageDimensions,
  frame: ImageDimensions,
): ImageCrop => {
  if (!hasDimensions(source) || !hasDimensions(frame))
    return { x: 0, y: 0, width: 100, height: 100 };

  const sourceAspect = source.width / source.height;
  const frameAspect = frame.width / frame.height;
  if (sourceAspect >= frameAspect) {
    const width = (frameAspect / sourceAspect) * 100;
    return { x: (100 - width) / 2, y: 0, width, height: 100 };
  }

  const height = (sourceAspect / frameAspect) * 100;
  return { x: 0, y: (100 - height) / 2, width: 100, height };
};

export const isCropCompatible = (
  crop: ImageCrop,
  source: ImageDimensions,
  frame: ImageDimensions,
) =>
  hasDimensions(source) &&
  hasDimensions(frame) &&
  Math.abs(
    (source.width * crop.width) / (source.height * crop.height) -
      frame.width / frame.height,
  ) <= 0.01;

export const moveCrop = (
  crop: ImageCrop,
  deltaX: number,
  deltaY: number,
  frame: ImageDimensions,
): ImageCrop => {
  if (!hasDimensions(frame)) return crop;

  return {
    ...crop,
    x: Math.min(
      100 - crop.width,
      Math.max(0, crop.x - (deltaX / frame.width) * crop.width),
    ),
    y: Math.min(
      100 - crop.height,
      Math.max(0, crop.y - (deltaY / frame.height) * crop.height),
    ),
  };
};

export const zoomCrop = (
  crop: ImageCrop,
  zoomFactor: number,
  anchor: Readonly<{ x: number; y: number }>,
  maximumCrop: ImageCrop,
): ImageCrop => {
  if (!Number.isFinite(zoomFactor) || zoomFactor <= 0) return crop;

  const maximumScale = Math.min(
    maximumCrop.width / crop.width,
    maximumCrop.height / crop.height,
  );
  const minimumScale = Math.max(
    maximumScale / 4,
    0.1 / crop.width,
    0.1 / crop.height,
  );
  const scale = Math.min(maximumScale, Math.max(minimumScale, 1 / zoomFactor));
  const width = crop.width * scale;
  const height = crop.height * scale;
  const anchorX = Math.min(1, Math.max(0, anchor.x));
  const anchorY = Math.min(1, Math.max(0, anchor.y));
  const sourceX = crop.x + anchorX * crop.width;
  const sourceY = crop.y + anchorY * crop.height;

  return {
    x: Math.min(100 - width, Math.max(0, sourceX - anchorX * width)),
    y: Math.min(100 - height, Math.max(0, sourceY - anchorY * height)),
    width,
    height,
  };
};

export const getCropStyle = (crop: ImageCrop) => ({
  position: "absolute" as const,
  maxWidth: "none",
  width: `${(100 / crop.width) * 100}%`,
  height: `${(100 / crop.height) * 100}%`,
  left: `${(-crop.x / crop.width) * 100}%`,
  top: `${(-crop.y / crop.height) * 100}%`,
});
