import * as v from "valibot";
import { describe, expect, it } from "vite-plus/test";
import {
  BENTO_BLOCK_SIZE_PRESETS,
  BENTO_BLOCK_TYPES,
  BENTO_COLUMNS_BY_MODE,
  BENTO_LAYOUT_MODES,
  WIDE_LAYOUT_BASE_WIDTH_REM,
  bentoLayoutSchema,
  getSizePresetDimensions,
  getAllowedSizePresets,
} from "../schemas/bento-layout.ts";

const textBlock = {
  id: "text-1",
  type: "text",
  layouts: {
    wide: { x: 0, y: 0, preset: "halfBanner" },
    compact: { x: 0, y: 0, preset: "halfBanner" },
  },
};

const sectionBlock = {
  id: "section-1",
  type: "section",
  layouts: {
    wide: { x: 0, y: 0, preset: "fullBanner" },
    compact: { x: 0, y: 0, preset: "fullBanner" },
  },
};

describe("bento layout configuration", (): void => {
  it("defines four wide columns, two compact columns, and a 78.75rem base width", (): void => {
    expect(BENTO_COLUMNS_BY_MODE).toEqual({ wide: 4, compact: 2 });
    expect(WIDE_LAYOUT_BASE_WIDTH_REM).toBe(78.75);
  });

  it("declares allowed presets per block type and retains unknown block sizes", (): void => {
    const cardPresets = [
      "squareSmall",
      "halfBanner",
      "landscape",
      "portrait",
      "squareLarge",
    ];

    expect(BENTO_BLOCK_SIZE_PRESETS).toEqual({
      section: ["fullBanner"],
      media: ["squareSmall", "landscape", "portrait", "squareLarge"],
      map: ["squareSmall", "landscape", "portrait", "squareLarge"],
      link: cardPresets,
      calendly: cardPresets,
      text: cardPresets,
      rss: cardPresets,
      spotify: cardPresets,
      tweet: ["portrait", "squareLarge"],
    });
    expect(getAllowedSizePresets("legacy-block")).toEqual(cardPresets);

    for (const blockType of BENTO_BLOCK_TYPES) {
      expect(getAllowedSizePresets(blockType).length).toBeGreaterThan(0);
    }

    for (const mode of BENTO_LAYOUT_MODES) {
      expect(getSizePresetDimensions("fullBanner", mode)).toEqual({
        width: mode === "wide" ? 4 : 2,
        height: 1,
      });
    }
  });
});

describe("bentoLayoutSchema", (): void => {
  it("accepts a valid item in both layouts", (): void => {
    expect(v.safeParse(bentoLayoutSchema, [textBlock]).success).toBe(true);
    expect(v.safeParse(bentoLayoutSchema, [sectionBlock]).success).toBe(true);
  });

  it("rejects a preset not allowed for the block type", (): void => {
    const invalidSection = {
      ...sectionBlock,
      layouts: {
        ...sectionBlock.layouts,
        wide: { x: 0, y: 0, preset: "halfBanner" },
      },
    };

    expect(v.safeParse(bentoLayoutSchema, [invalidSection]).success).toBe(
      false,
    );
  });

  it("rejects duplicate block IDs", (): void => {
    const duplicate = {
      ...textBlock,
      layouts: {
        wide: { x: 2, y: 0, preset: "halfBanner" },
        compact: { x: 0, y: 1, preset: "halfBanner" },
      },
    };

    expect(v.safeParse(bentoLayoutSchema, [textBlock, duplicate]).success).toBe(
      false,
    );
  });

  it("rejects positions outside either grid", (): void => {
    const outOfBounds = {
      ...textBlock,
      layouts: {
        wide: { x: 3, y: 0, preset: "halfBanner" },
        compact: { x: 0, y: 0, preset: "halfBanner" },
      },
    };

    expect(v.safeParse(bentoLayoutSchema, [outOfBounds]).success).toBe(false);

    const compactOutOfBounds = {
      ...textBlock,
      layouts: {
        wide: { x: 0, y: 0, preset: "halfBanner" },
        compact: { x: 2, y: 0, preset: "squareSmall" },
      },
    };

    expect(v.safeParse(bentoLayoutSchema, [compactOutOfBounds]).success).toBe(
      false,
    );
  });
});

describe("bentoLayoutSchema collision and fallback checks", (): void => {
  it("rejects overlapping blocks in either layout", (): void => {
    const secondBlock = {
      ...textBlock,
      id: "text-2",
      layouts: {
        wide: { x: 1, y: 0, preset: "halfBanner" },
        compact: { x: 0, y: 2, preset: "halfBanner" },
      },
    };

    expect(
      v.safeParse(bentoLayoutSchema, [textBlock, secondBlock]).success,
    ).toBe(false);

    const compactOverlap = {
      ...textBlock,
      id: "text-3",
      layouts: {
        wide: { x: 2, y: 0, preset: "halfBanner" },
        compact: { x: 0, y: 0, preset: "halfBanner" },
      },
    };

    expect(
      v.safeParse(bentoLayoutSchema, [textBlock, compactOverlap]).success,
    ).toBe(false);
  });

  it("rejects negative and fractional grid positions", (): void => {
    const invalidPosition = {
      ...textBlock,
      layouts: {
        wide: { x: 0.5, y: 0, preset: "halfBanner" },
        compact: { x: -1, y: 0, preset: "halfBanner" },
      },
    };

    expect(v.safeParse(bentoLayoutSchema, [invalidPosition]).success).toBe(
      false,
    );
  });

  it("lets unknown block types use card presets that fit the grid", (): void => {
    const unknownBlock = {
      id: "future-1",
      type: "future-block",
      layouts: {
        wide: { x: 0, y: 0, preset: "squareLarge" },
        compact: { x: 0, y: 0, preset: "squareLarge" },
      },
    };

    expect(v.safeParse(bentoLayoutSchema, [unknownBlock]).success).toBe(true);
  });
});
