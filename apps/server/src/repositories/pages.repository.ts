import "server-only";
import type { PageUpdate } from "@grabbin/shared/schemas/page";
import { createDatabase, type Database } from "@grabbin/db";
import { pages } from "@grabbin/db/schema/pages";
import { and, eq as equal } from "drizzle-orm";
import { isPostgresUniqueViolation } from "../lib/postgres-error";

export const PAGE_REPOSITORY_STATUS = {
  uniqueConflict: "unique-conflict",
} as const;

export class PagesRepository {
  constructor(private readonly database: Database) {}

  static fromConnectionString(connectionString: string): PagesRepository {
    return new PagesRepository(createDatabase(connectionString));
  }

  async isHandleAvailable(handle: string): Promise<boolean> {
    const matchingPage = await this.database.query.pages.findFirst({
      columns: { id: true },
      where: (page, { eq }) => eq(page.handle, handle),
    });

    return matchingPage === undefined;
  }

  async findByUserId(userId: string): Promise<string | undefined> {
    const data = await this.database.query.pages.findFirst({
      columns: { handle: true },
      where: (page, { eq }) => eq(page.userId, userId),
    });

    return data?.handle;
  }

  findByHandle(handle: string) {
    return this.database.query.pages.findFirst({
      columns: {
        userId: true,
        handle: true,
        name: true,
        bio: true,
        imageKey: true,
      },
      where: (page, { eq }) => eq(page.handle, handle),
    });
  }

  async updateForUser(
    userId: string,
    currentHandle: string,
    update: PageUpdate,
  ) {
    try {
      const [page] = await this.database
        .update(pages)
        .set(update)
        .where(
          and(equal(pages.userId, userId), equal(pages.handle, currentHandle)),
        )
        .returning({
          handle: pages.handle,
          name: pages.name,
          bio: pages.bio,
        });

      return page;
    } catch (error) {
      if (isPostgresUniqueViolation(error, "pages_handle_idx"))
        return { status: PAGE_REPOSITORY_STATUS.uniqueConflict };
      throw error;
    }
  }

  async hasPageForUser(userId: string): Promise<boolean> {
    const page = await this.database.query.pages.findFirst({
      columns: { id: true },
      where: (row, { eq }) => eq(row.userId, userId),
    });

    return page !== undefined;
  }

  async createForUser(
    userId: string,
    handle: string,
  ): Promise<
    { status: typeof PAGE_REPOSITORY_STATUS.uniqueConflict } | undefined
  > {
    try {
      await this.database
        .insert(pages)
        .values({ id: crypto.randomUUID(), userId, handle })
        .onConflictDoNothing({ target: pages.userId });
      return undefined;
    } catch (error) {
      if (isPostgresUniqueViolation(error, "pages_handle_idx"))
        return { status: PAGE_REPOSITORY_STATUS.uniqueConflict };
      throw error;
    }
  }
}
