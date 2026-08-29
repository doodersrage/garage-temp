import { describe, expect, it } from "vitest";
import { getRuntimeEnv, hasRuntimeEnv } from "./runtimeEnv";

describe("runtimeEnv", () => {
  it("reads baked import.meta.env values when present", () => {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    const previous = env.RUNTIME_ENV_TEST_KEY;
    env.RUNTIME_ENV_TEST_KEY = "  hello  ";
    expect(getRuntimeEnv("RUNTIME_ENV_TEST_KEY")).toBe("hello");
    expect(hasRuntimeEnv("RUNTIME_ENV_TEST_KEY")).toBe(true);
    env.RUNTIME_ENV_TEST_KEY = previous;
  });

  it("returns undefined for missing keys outside Workers", () => {
    expect(getRuntimeEnv("DEFINITELY_MISSING_RUNTIME_ENV_KEY_XYZ")).toBeUndefined();
    expect(hasRuntimeEnv("DEFINITELY_MISSING_RUNTIME_ENV_KEY_XYZ")).toBe(false);
  });
});
