import { MIN_PASSWORD_LENGTH, validateNewPassword, validateSignup } from "@csc-3100-ama/shared";
import { validateLogin } from "./loginValidation";

// The sign-up rules are shared with the web app (packages/shared); these tests
// check they are reachable from the mobile bundle and behave the same.
const good = "a".repeat(MIN_PASSWORD_LENGTH);

describe("shared password rules in the mobile app", () => {
  it("requires at least 12 characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(validateNewPassword("a".repeat(11), "a".repeat(11))?.field).toBe("password");
    expect(validateNewPassword(good, good)).toBeNull();
  });

  it("requires the two passwords to match", () => {
    expect(validateNewPassword(good, good + "x")?.field).toBe("confirm");
  });

  it("checks the name, then the email, then the password", () => {
    const base = { name: "Sam", email: "sam@example.com", password: good, confirm: good };
    expect(validateSignup(base)).toBeNull();
    expect(validateSignup({ ...base, name: " " })?.field).toBe("name");
    expect(validateSignup({ ...base, email: "not-an-email" })?.field).toBe("email");
    expect(validateSignup({ ...base, confirm: "different" })?.field).toBe("confirm");
  });
});

describe("validateLogin", () => {
  it("accepts a valid email and any password", () => {
    expect(validateLogin(" Sam@Example.com ", "x")).toBeNull();
  });

  it("flags a bad email first", () => {
    expect(validateLogin("nope", "")?.field).toBe("email");
  });

  it("flags an empty password", () => {
    expect(validateLogin("sam@example.com", "")).toEqual({
      field: "password",
      message: "Enter your password.",
    });
  });
});
