import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import {
  getAllowedSizePresets,
  type BentoLayoutMode,
} from "@grabbin/shared/schemas/bento-layout";
import isEqual from "es-toolkit/compat/isEqual";
import type { BentoCommand } from "./commands";

const updateItem = (
  items: readonly BentoItem[],
  id: BentoItem["id"],
  onUpdate: (item: BentoItem) => BentoItem,
): readonly BentoItem[] => {
  const updatedItems = items.map((item) =>
    item.id === id ? onUpdate(item) : item,
  );

  return updatedItems.every((item, index) => item === items[index])
    ? items
    : updatedItems;
};

const hasSamePosition = (
  first: BentoItem["layouts"][BentoLayoutMode],
  second: BentoItem["layouts"][BentoLayoutMode],
): boolean =>
  first.x === second.x &&
  first.y === second.y &&
  first.preset === second.preset;

export const reduceBentoItems = (
  items: readonly BentoItem[],
  command: BentoCommand,
): readonly BentoItem[] => {
  switch (command.type) {
    case "add":
      return items.some((item) => item.id === command.item.id)
        ? items
        : [...items, command.item];
    case "update-data":
      return updateItem(items, command.id, (item) =>
        isEqual(item.data, command.data)
          ? item
          : { ...item, data: command.data },
      );
    case "update-style":
      return updateItem(items, command.id, (item) =>
        isEqual(item.style, command.style)
          ? item
          : { ...item, style: command.style },
      );
    case "apply-preset":
      return updateItem(items, command.id, (item) => {
        if (
          !getAllowedSizePresets(item.type).includes(command.preset) ||
          item.layouts[command.mode].preset === command.preset
        )
          return item;

        return {
          ...item,
          layouts: {
            ...item.layouts,
            [command.mode]: {
              ...item.layouts[command.mode],
              preset: command.preset,
            },
          },
        };
      });
    case "replace-layout":
      return updateItem(items, command.id, (item) => {
        if (hasSamePosition(item.layouts[command.mode], command.layout))
          return item;

        return {
          ...item,
          layouts: { ...item.layouts, [command.mode]: command.layout },
        };
      });
    case "delete": {
      const hasItemToDelete = items.some((item) => item.id === command.id);
      return hasItemToDelete
        ? items.filter((item) => item.id !== command.id)
        : items;
    }
    default: {
      const exhaustiveCommand: never = command;
      return exhaustiveCommand;
    }
  }
};
