import "server-only";
import type { Database } from "@grabbin/db";
import { bentoItems } from "@grabbin/db/schema/bento-items";
import { pages } from "@grabbin/db/schema/pages";
import { eq } from "drizzle-orm";

export function findPageSnapshotRowsByHandle(
  database: Database,
  handle: string,
) {
  return database
    .select({
      page: {
        userId: pages.userId,
        handle: pages.handle,
        name: pages.name,
        bio: pages.bio,
        imageKey: pages.imageKey,
        imageCrop: pages.imageCrop,
      },
      bento: {
        id: bentoItems.id,
        type: bentoItems.type,
        data: bentoItems.data,
        style: bentoItems.style,
        layouts: bentoItems.layouts,
      },
    })
    .from(pages)
    .leftJoin(bentoItems, eq(bentoItems.pageId, pages.id))
    .where(eq(pages.handle, handle));
}
