import assert from "node:assert/strict";

export function assertEquals(actual: unknown, expected: unknown): void {
  assert.deepStrictEqual(actual, expected);
}
export function assertThrows(fn: () => unknown, expected?: { name: string }): Error {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error);
    if (expected) assert(error.name === expected.name);
    return error;
  }
  throw new Error("Expected an exception");
}
export async function assertRejects(
  fn: () => Promise<unknown>,
  expected?: { name: string },
): Promise<Error> {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof Error);
    if (expected) assert(error.name === expected.name);
    return error;
  }
  throw new Error("Expected a rejection");
}
