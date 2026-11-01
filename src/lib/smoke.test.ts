import { expect, test } from "bun:test";
import animals from "../../content/animals.json" with { type: "json" };

test("content file has four worlds", () => {
  expect(animals.worlds).toHaveLength(4);
});
