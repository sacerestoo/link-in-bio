import "server-only";
import type { Database } from "@grabbin/db";
import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import { bentoItems } from "@grabbin/db/schema/bento-items";
import { and, eq, inArray, sql } from "drizzle-orm";

type BentoDatabaseExecutor =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];

export class BentoService {
  constructor(private readonly executor: BentoDatabaseExecutor) {}

  async upsert(
    pageId: string,
    items: readonly BentoItem[],
  ): Promise<BentoItem["id"][]> {
    if (items.length === 0) return [];

    const changedItems = await this.executor
      .insert(bentoItems)
      .values(items.map((item) => ({ ...item, pageId })))
      .onConflictDoUpdate({
        target: bentoItems.id,
        set: {
          type: sql`excluded.type`,
          data: sql`excluded.data`,
          style: sql`excluded.style`,
          layouts: sql`excluded.layouts`,
          updatedAt: sql`now()`,
        },
        setWhere: eq(bentoItems.pageId, pageId),
      })
      .returning({ id: bentoItems.id });

    return changedItems.map((item) => item.id);
  }

  async delete(
    pageId: string,
    itemIds: readonly BentoItem["id"][],
  ): Promise<void> {
    if (itemIds.length === 0) return;

    await this.executor
      .delete(bentoItems)
      .where(
        and(eq(bentoItems.pageId, pageId), inArray(bentoItems.id, itemIds)),
      );
  }
}
