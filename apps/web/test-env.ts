export function createTestEnv(mode: string): Readonly<object> {
  if (mode !== "test") {
    throw new Error("Worker test bindings are only available in test mode.");
  }
  return Object.freeze({});
}

export const env = createTestEnv("test");
