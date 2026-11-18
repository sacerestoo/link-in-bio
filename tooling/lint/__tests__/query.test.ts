import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, expect, it } from "vite-plus/test";
import queryPlugin from "../query.ts";

RuleTester.describe = (name, callback): void => {
  void describe(name, callback);
};
RuleTester.it = (name, callback): void => {
  it(name, callback);
};

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});
const canonicalQueryDefinitions =
  queryPlugin.rules["canonical-query-definitions"];
const canonicalQueryHooks = queryPlugin.rules["canonical-query-hooks"];
const noHardcodedQueryKeys = queryPlugin.rules["no-hardcoded-query-keys"];
const noPageSetQueryData = queryPlugin.rules["no-page-set-query-data"];
const queriesFile = "apps/web/features/projects/queries.ts";
const queryHookFile = "apps/web/features/projects/hooks/use-projects.ts";

tester.run("canonical-query-definitions", canonicalQueryDefinitions, {
  valid: [
    {
      filename: queriesFile,
      code: 'import { queryOptions } from "@tanstack/react-query"; queryOptions({ queryKey: [] });',
    },
    {
      filename: queriesFile,
      code: 'import { queryOptions as options } from "@tanstack/react-query"; options({ queryKey: [] });',
    },
  ],
  invalid: [
    {
      filename: "apps/web/features/projects/use-projects.ts",
      code: 'import { queryOptions } from "@tanstack/react-query"; queryOptions({ queryKey: [] });',
      errors: [{ message: /only from the feature/u }],
    },
    {
      filename: "apps/web/features/projects/use-projects.ts",
      code: 'import * as query from "@tanstack/react-query"; query.queryOptions({ queryKey: [] });',
      errors: [{ message: /only from the feature/u }],
    },
  ],
});

tester.run("canonical-query-hooks", canonicalQueryHooks, {
  valid: [
    {
      filename: queriesFile,
      code: `import { queryOptions, useQuery } from "@tanstack/react-query";
        const projectsQueryKey = () => ["projects"];
        const projectsQueryOptions = () => queryOptions({
          queryKey: projectsQueryKey(), queryFn: load
        });
        function useProjects() {
          return useQuery({ ...projectsQueryOptions(), enabled: true });
        }`,
    },
    {
      filename: queriesFile,
      code: `import { useQuery, queryOptions } from "@tanstack/react-query";
        const projectsQueryKey = () => ["projects"];
        function useProjects() {
          return useQuery(queryOptions({
            queryKey: projectsQueryKey(), queryFn: load
          }));
        }`,
    },
  ],
  invalid: [
    {
      filename: "apps/web/features/projects/ui/projects.tsx",
      code: `import { useQuery } from "@tanstack/react-query";
        function Projects() { return useQuery({ queryKey: [], queryFn: load }); }`,
      errors: [{ message: /feature's queries\.ts/u }],
    },
    {
      filename: queryHookFile,
      code: `import { useQuery } from "@tanstack/react-query";
        import { projectsQueryOptions } from "../queries";
        function useProjects() { return useQuery(projectsQueryOptions()); }`,
      errors: [{ message: /feature's queries\.ts/u }],
    },
    {
      filename: queriesFile,
      code: `import { useQuery } from "@tanstack/react-query";
        function useProjects() {
          return useQuery({ queryKey: [], queryFn: load });
        }`,
      errors: [{ message: /using queryOptions/u }],
    },
  ],
});

tester.run("no-hardcoded-query-keys", noHardcodedQueryKeys, {
  valid: [
    {
      filename: queriesFile,
      code: `import { queryOptions } from "@tanstack/react-query";
        export const userQueryKey = () => ["users"];
        queryOptions({ queryKey: userQueryKey() });`,
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: `import { projectsQueryKey as keys } from "./queries";
        client.invalidateQueries({ queryKey: keys("user-1") });`,
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: 'const metadata = { queryKey: ["display-only"] };',
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: 'import { projectsQueryKey } from "./queries"; client.getQueryData(projectsQueryKey());',
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: 'import { projectsQueryKey as keyFactory } from "./queries"; client.getQueryData(keyFactory());',
    },
  ],
  invalid: [
    {
      filename: queriesFile,
      code: `import { queryOptions } from "@tanstack/react-query";
        queryOptions({ queryKey: ["users"] });`,
      errors: [{ message: /query key factory/u }],
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: 'import { userKeys } from "./keys"; client.invalidateQueries({ queryKey: userKeys.list() });',
      errors: [{ message: /queries\.ts/u }],
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: 'client.invalidateQueries({ queryKey: ["users"] });',
      errors: [{ message: /queries\.ts/u }],
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: 'import { projectsQueryKey } from "./queries"; function run(projectsQueryKey: () => string[]) { client.getQueryData(projectsQueryKey()); }',
      errors: [{ message: /queries\.ts/u }],
    },
    {
      filename: "apps/web/features/projects/use-project-mutations.ts",
      code: 'import { projectsQueryKey } from "./queries"; function run() { const projectsQueryKey = () => ["fake"]; client.getQueryData(projectsQueryKey()); }',
      errors: [{ message: /queries\.ts/u }],
    },
  ],
});

tester.run("no-page-set-query-data", noPageSetQueryData, {
  valid: [
    {
      filename: "apps/web/app/[handle]/page.tsx",
      code: "queryClient.query({ queryKey: pageQueryKey(handle), queryFn: getPage });",
    },
    {
      filename: "apps/web/features/auth/ui/change-handle-form.tsx",
      code: "queryClient.setQueryData(pageQueryKey(handle), page);",
    },
  ],
  invalid: [
    {
      filename: "apps/web/app/[handle]/page.tsx",
      code: "queryClient.setQueryData(pageQueryKey(handle), page);",
      errors: [{ message: /queryClient\.query/u }],
    },
  ],
});

it("registers the canonical query rules", () => {
  expect(Object.keys(queryPlugin.rules)).toEqual([
    "canonical-query-definitions",
    "canonical-query-hooks",
    "no-hardcoded-query-keys",
    "no-page-set-query-data",
  ]);
});
