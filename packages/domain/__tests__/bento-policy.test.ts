import { describe, expect, it } from "vite-plus/test";
import type { BentoBlockType, BentoSizePreset } from "../src/bento-layout.ts";
import {
  applyBentoBatchPolicy,
  type BentoBatchRequest,
  type BentoItem,
} from "../src/bento.ts";

const createItem = (
  id: string,
  type: BentoBlockType,
  wideX = 0,
  compactY = 0,
): BentoItem => {
  const preset: BentoSizePreset =
    type === "section"
      ? "fullBanner"
      : type === "media" || type === "map"
        ? "squareSmall"
        : "halfBanner";
  return {
    id,
    type,
    data: {},
    style: {},
    layouts: {
      wide: { x: wideX, y: 0, preset },
      compact: { x: 0, y: compactY, preset },
    },
  };
};

const createBatch = (
  upserts: BentoItem[] = [],
  deletes: string[] = [],
): BentoBatchRequest => ({ upserts, deletes });

describe("applyBentoBatchPolicy", (): void => {
  it("returns the final items after upserts and deletes", (): void => {
    const current = createItem("current", "text");
    const added = createItem("added", "media", 2, 2);
    const result = applyBentoBatchPolicy(
      [current, createItem("deleted", "text", 2, 2)],
      createBatch([added], ["deleted"]),
    );

    expect(result).toEqual({ status: "valid", items: [current, added] });
  });

  it("rejects duplicate upserts and deletes", (): void => {
    const item = createItem("same", "text");

    expect(applyBentoBatchPolicy([], createBatch([item, item]))).toEqual({
      status: "invalid",
      reason: "duplicate-upsert-id",
    });
    expect(
      applyBentoBatchPolicy([], createBatch([], ["same", "same"])),
    ).toEqual({ status: "invalid", reason: "duplicate-delete-id" });
  });

  it("rejects IDs used by both an upsert and delete", (): void => {
    expect(
      applyBentoBatchPolicy(
        [],
        createBatch([createItem("same", "text")], ["same"]),
      ),
    ).toEqual({ status: "invalid", reason: "upsert-delete-overlap" });
  });

  it("rejects changing an existing item's type", (): void => {
    expect(
      applyBentoBatchPolicy(
        [createItem("same", "text")],
        createBatch([createItem("same", "media")]),
      ),
    ).toEqual({ status: "invalid", reason: "item-type-change" });
  });

  it("rejects a batch that overlaps the final layout", (): void => {
    expect(
      applyBentoBatchPolicy(
        [createItem("existing", "text")],
        createBatch([createItem("added", "text", 1, 2)]),
      ),
    ).toEqual({ status: "invalid", reason: "invalid-final-layout" });
  });
});
