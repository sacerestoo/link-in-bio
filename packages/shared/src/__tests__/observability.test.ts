import { describe, expect, it } from "vite-plus/test";
import { sentryPrivacyOptions } from "../observability";

describe("sentryPrivacyOptions", (): void => {
  it("turns off automatically collected user and request data", (): void => {
    expect(sentryPrivacyOptions.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    });
  });
});
