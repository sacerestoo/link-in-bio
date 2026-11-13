import { afterEach, describe, expect, it } from "vite-plus/test";
import { createFixture, removeFixtures } from "../../architecture/fixture.ts";
import { checkDatabaseShape, type DatabaseConfig } from "../db-schema.ts";

const config: DatabaseConfig = {
  databaseDirectory: "db",
  schemaDirectory: "db/schema",
  clientFile: "db/client.ts",
  migrationsDirectory: "db/migrations",
  queriesDirectory: "db/queries",
};

const client = `import * as authSchema from "./schema/auth";
import * as listingSchema from "./schema/item-listing";
export const schema = { ...authSchema, ...listingSchema };
export const db = drizzle(pool, { schema });
`;

const writeDatabase = (clientSource: string): string => {
  const { root, write } = createFixture("db-schema-");
  write("db/client.ts", clientSource);
  write("db/schema/auth.ts");
  write("db/schema/item-listing.ts");
  return root;
};

afterEach(removeFixtures);

describe("checkDatabaseShape", (): void => {
  it("accepts flat domain schema files registered in the client", (): void => {
    const { root, write } = createFixture("db-schema-");
    write("db/client.ts", client);
    write("db/schema/auth.ts");
    write("db/schema/item-listing.ts");
    write("db/migrations/0000_init.sql", "");
    write("db/queries/item-listing.ts");

    expect(checkDatabaseShape(root, config)).toEqual([]);
  });

  it("rejects stray db files, barrels, nested folders, and unregistered domains", (): void => {
    const { root, write } = createFixture("db-schema-");
    write("db/client.ts", client);
    write("db/schema.ts");
    write("db/schema/auth.ts");
    write("db/schema/item-listing.ts");
    write("db/schema/index.ts");
    write("db/schema/billing/invoice.ts");
    write("db/schema/payments.ts");

    expect(checkDatabaseShape(root, config).toSorted()).toEqual([
      expect.stringMatching(/^Move db\/schema\.ts/u),
      expect.stringMatching(
        /^Register db\/schema\/payments\.ts in db\/client\.ts/u,
      ),
      expect.stringMatching(/^Rename db\/schema\/billing:/u),
      expect.stringMatching(/^Rename db\/schema\/index\.ts:/u),
    ]);
  });
});

describe("checkDatabaseShape schema registry", (): void => {
  it("rejects a domain that is imported but not spread into schema", (): void => {
    const root = writeDatabase(
      client.replace("...authSchema, ...listingSchema", "...authSchema"),
    );

    expect(checkDatabaseShape(root, config)).toEqual([
      expect.stringMatching(
        /^Register db\/schema\/item-listing\.ts in db\/client\.ts: spread listingSchema/u,
      ),
    ]);
  });

  it("rejects an empty schema object even when every domain is imported", (): void => {
    const root = writeDatabase(
      client.replace("{ ...authSchema, ...listingSchema }", "{}"),
    );

    expect(checkDatabaseShape(root, config)).toHaveLength(2);
  });

  it("rejects a domain file that the client never imports", (): void => {
    const root = writeDatabase(
      client
        .replace(
          'import * as listingSchema from "./schema/item-listing";\n',
          "",
        )
        .replace(", ...listingSchema", ""),
    );

    expect(checkDatabaseShape(root, config)).toEqual([
      expect.stringMatching(
        /^Register db\/schema\/item-listing\.ts in db\/client\.ts: import/u,
      ),
    ]);
  });

  it("rejects a schema object that never reaches drizzle()", (): void => {
    const root = writeDatabase(
      client.replace("drizzle(pool, { schema })", "drizzle(pool)"),
    );

    expect(checkDatabaseShape(root, config)).toEqual([
      expect.stringMatching(/^Pass `\{ schema \}` to drizzle\(\)/u),
    ]);
  });
});
