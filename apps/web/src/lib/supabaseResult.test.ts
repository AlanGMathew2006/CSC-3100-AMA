import { describe, expect, it } from "vitest";
import { unwrap } from "./supabaseResult";

describe("unwrap", () => {
  it("returns the data when there is no error", () => {
    const data = { session: null };
    expect(unwrap({ data, error: null })).toBe(data);
  });

  it("throws the very same error object Supabase returned", () => {
    const error = new Error("Invalid login credentials");
    expect(() => unwrap({ data: null, error })).toThrow(error);
    try {
      unwrap({ data: null, error });
    } catch (thrown) {
      expect(thrown).toBe(error);
    }
  });

  it("throws even when data came back alongside the error", () => {
    const error = new Error("nope");
    expect(() => unwrap({ data: { user: null }, error })).toThrow(error);
  });

  it("returns undefined for calls that have no data, like signOut", () => {
    expect(unwrap({ error: null })).toBeUndefined();
  });
});
