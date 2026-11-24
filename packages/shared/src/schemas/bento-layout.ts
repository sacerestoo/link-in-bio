import * as v from "valibot";

export const BENTO_LAYOUT_MODES = ["wide", "compact"] as const;

export type BentoLayoutMode = (typeof BENTO_LAYOUT_MODES)[number];

export const BENTO_COLUMNS_BY_MODE = {
  wide: 4,
  compact: 2,
} as const satisfies Record<BentoLayoutMode, number>;

export const WIDE_LAYOUT_BASE_WIDTH_REM = 78.75;

export const BENTO_SIZE_PRESETS = [
  "fullBanner",
  "halfBanner",
  "squareSmall",
  "landscape",
  "squareLarge",
  "portrait",
] as const;

export type BentoSizePreset = (typeof BENTO_SIZE_PRESETS)[number];

const cardPresets = [
  "squareSmall",
  "halfBanner",
  "landscape",
  "portrait",
  "squareLarge",
] as const satisfies readonly BentoSizePreset[];

export const BENTO_BLOCK_TYPES = [
  "section",
  "media",
  "map",
  "link",
  "calendly",
  "text",
  "rss",
  "spotify",
  "tweet",
] as const;

export type BentoBlockType = (typeof BENTO_BLOCK_TYPES)[number];

export const BENTO_BLOCK_SIZE_PRESETS = {
  section: ["fullBanner"],
  media: ["squareSmall", "landscape", "portrait", "squareLarge"],
  map: ["squareSmall", "landscape", "portrait", "squareLarge"],
  link: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
  calendly: [
    "squareSmall",
    "halfBanner",
    "landscape",
    "portrait",
    "squareLarge",
  ],
  text: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
  rss: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
  spotify: [
    "squareSmall",
    "halfBanner",
    "landscape",
    "portrait",
    "squareLarge",
  ],
  // Tweets need the tall sizes to show the post body.
  tweet: ["portrait", "squareLarge"],
} as const satisfies Record<BentoBlockType, readonly BentoSizePreset[]>;

// Unknown blocks use card sizes; only sections get full banners.
export const BENTO_UNKNOWN_BLOCK_SIZE_PRESETS = cardPresets;

const blockSizePresetsByType: Readonly<
  Partial<Record<string, readonly BentoSizePreset[]>>
> = BENTO_BLOCK_SIZE_PRESETS;

export const getAllowedSizePresets = (
  blockType: string,
): readonly BentoSizePreset[] =>
  blockSizePresetsByType[blockType] ?? BENTO_UNKNOWN_BLOCK_SIZE_PRESETS;

export const BENTO_SIZE_PRESET_DIMENSIONS = {
  fullBanner: { width: 4, height: 1 },
  halfBanner: { width: 2, height: 1 },
  squareSmall: { width: 1, height: 2 },
  landscape: { width: 2, height: 2 },
  squareLarge: { width: 2, height: 4 },
  portrait: { width: 1, height: 4 },
} as const satisfies Record<
  BentoSizePreset,
  Readonly<{ width: number; height: number }>
>;

export const getSizePresetDimensions = (
  preset: BentoSizePreset,
  mode: BentoLayoutMode,
): Readonly<{ width: number; height: number }> => {
  const dimensions = BENTO_SIZE_PRESET_DIMENSIONS[preset];
  return preset === "fullBanner" && mode === "compact"
    ? { ...dimensions, width: 2 }
    : dimensions;
};

const positionSchema = v.object({
  x: v.pipe(v.number(), v.integer(), v.minValue(0)),
  y: v.pipe(v.number(), v.integer(), v.minValue(0)),
  preset: v.picklist(BENTO_SIZE_PRESETS),
});

export const bentoLayoutEntrySchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.pipe(v.string(), v.minLength(1)),
  layouts: v.object({
    wide: positionSchema,
    compact: positionSchema,
  }),
});

type BentoLayoutEntry = v.InferOutput<typeof bentoLayoutEntrySchema>;

const hasUniqueIds = (entries: BentoLayoutEntry[]): boolean => {
  const ids = new Set(entries.map((entry) => entry.id));
  return ids.size === entries.length;
};

const usesAllowedPresets = (
  entries: BentoLayoutEntry[],
  mode: BentoLayoutMode,
): boolean =>
  entries.every((entry) =>
    getAllowedSizePresets(entry.type).includes(entry.layouts[mode].preset),
  );

const fitsGrid = (
  entries: BentoLayoutEntry[],
  mode: BentoLayoutMode,
): boolean =>
  entries.every((entry) => {
    const position = entry.layouts[mode];
    const { width } = getSizePresetDimensions(position.preset, mode);
    return position.x + width <= BENTO_COLUMNS_BY_MODE[mode];
  });

const hasNoOverlaps = (
  entries: BentoLayoutEntry[],
  mode: BentoLayoutMode,
): boolean => {
  for (let firstIndex = 0; firstIndex < entries.length; firstIndex += 1) {
    const firstEntry = entries[firstIndex];
    if (firstEntry === undefined) continue;

    const first = firstEntry.layouts[mode];
    const firstSize = getSizePresetDimensions(first.preset, mode);

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < entries.length;
      secondIndex += 1
    ) {
      const secondEntry = entries[secondIndex];
      if (secondEntry === undefined) continue;

      const second = secondEntry.layouts[mode];
      const secondSize = getSizePresetDimensions(second.preset, mode);
      const overlaps =
        first.x < second.x + secondSize.width &&
        first.x + firstSize.width > second.x &&
        first.y < second.y + secondSize.height &&
        first.y + firstSize.height > second.y;

      if (overlaps) return false;
    }
  }

  return true;
};

export const bentoLayoutSchema = v.pipe(
  v.array(bentoLayoutEntrySchema),
  v.check(hasUniqueIds, "Block IDs must be unique."),
  v.check(
    (entries) => usesAllowedPresets(entries, "wide"),
    "Each block must use a preset allowed for its type in the wide layout.",
  ),
  v.check(
    (entries) => usesAllowedPresets(entries, "compact"),
    "Each block must use a preset allowed for its type in the compact layout.",
  ),
  v.check(
    (entries) => fitsGrid(entries, "wide"),
    "Each block must fit inside the wide layout grid.",
  ),
  v.check(
    (entries) => fitsGrid(entries, "compact"),
    "Each block must fit inside the compact layout grid.",
  ),
  v.check(
    (entries) => hasNoOverlaps(entries, "wide"),
    "Blocks must not overlap in the wide layout.",
  ),
  v.check(
    (entries) => hasNoOverlaps(entries, "compact"),
    "Blocks must not overlap in the compact layout.",
  ),
);

export type BentoLayout = v.InferOutput<typeof bentoLayoutSchema>;
