import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../src/index.js";

describe("parseCliArgs", () => {
  it("parses serve arguments", () => {
    expect(
      parseCliArgs(["serve", "--host", "0.0.0.0", "--port", "8787"]),
    ).toEqual({
      command: "serve",
      host: "0.0.0.0",
      port: 8787,
      dryRun: false,
      resume: false,
    });
  });
});
