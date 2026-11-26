import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import { useCallback } from "react";
import type { BentoCommand } from "../commands";
import { reduceBentoItems } from "../reducer";

export const useBentoDispatch = (
  items: readonly BentoItem[],
  onItemsChange: (items: readonly BentoItem[]) => void,
) =>
  useCallback(
    (command: BentoCommand) => {
      const nextItems = reduceBentoItems(items, command);
      if (nextItems === items) return;
      onItemsChange(nextItems);
    },
    [items, onItemsChange],
  );
