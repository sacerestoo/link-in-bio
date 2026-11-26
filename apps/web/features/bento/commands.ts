import type { BentoItem } from "@grabbin/domain/bento";
import type {
  BentoLayoutMode,
  BentoSizePreset,
} from "@grabbin/domain/bento-layout";

export type BentoCommand =
  | { type: "add"; item: BentoItem }
  | { type: "update-data"; id: BentoItem["id"]; data: BentoItem["data"] }
  | {
      type: "update-style";
      id: BentoItem["id"];
      style: BentoItem["style"];
    }
  | {
      type: "apply-preset";
      id: BentoItem["id"];
      mode: BentoLayoutMode;
      preset: BentoSizePreset;
    }
  | {
      type: "replace-layout";
      id: BentoItem["id"];
      mode: BentoLayoutMode;
      layout: BentoItem["layouts"][BentoLayoutMode];
    }
  | { type: "delete"; id: BentoItem["id"] };
