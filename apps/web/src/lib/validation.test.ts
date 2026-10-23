import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MIN_PASSWORD_LENGTH, validateNewPassword, validateSignup } from "./validation";

const good = "a".repeat(MIN_PASSWORD_LENGTH);
const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);

describe("validateNewPassword", () => {
  it("accepts a long enough password that matches", () => {
    assert.equal(validateNewPassword(good, good), null);
  });

  it("rejects a password shorter than the minimum", () => {
    assert.deepEqual(validateNewPassword(short, short), {
      field: "password",
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
    });
  });

  it("rejects passwords that don't match", () => {
    assert.deepEqual(validateNewPassword(good, good + "x"), {
      field: "confirm",
      message: "Passwords don't match. Try again.",
    });
  });

  it("reports length before mismatch", () => {
    assert.equal(validateNewPassword(short, "different")?.field, "password");
  });
});

describe("validateSignup", () => {
  const valid = { name: "Aarav", email: "a@calpoly.edu", password: good, confirm: good };

  it("accepts valid input", () => {
    assert.equal(validateSignup(valid), null);
  });

  it("checks name and email before the password", () => {
    assert.equal(validateSignup({ ...valid, name: " ", password: short })?.field, "name");
    assert.equal(validateSignup({ ...valid, email: "bad", password: short })?.field, "email");
  });

  it("uses the same password rules as password reset", () => {
    assert.deepEqual(
      validateSignup({ ...valid, password: short, confirm: short }),
      validateNewPassword(short, short),
    );
    assert.deepEqual(
      validateSignup({ ...valid, confirm: good + "x" }),
      validateNewPassword(good, good + "x"),
    );
  });
});
