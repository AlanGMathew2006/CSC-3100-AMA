import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "./LoginScreen";
import { SignupScreen } from "./SignupScreen";

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ signIn: mockSignIn, signUp: mockSignUp }),
}));

const longPassword = "correct horse battery";

beforeEach(() => {
  mockSignIn.mockReset().mockResolvedValue(undefined);
  mockSignUp.mockReset().mockResolvedValue(false);
});

describe("LoginScreen", () => {
  it("rejects a bad email without calling Supabase", async () => {
    await render(<LoginScreen onCreateAccount={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "nope");
    await fireEvent.changeText(screen.getByLabelText("Password"), "x");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("rejects an empty password", async () => {
    await render(<LoginScreen onCreateAccount={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "sam@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter your password.")).toBeTruthy();
  });

  it("signs in with the typed values", async () => {
    await render(<LoginScreen onCreateAccount={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "sam@example.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), longPassword);
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("sam@example.com", longPassword));
  });

  it("shows a friendly message for wrong credentials", async () => {
    mockSignIn.mockRejectedValue({ code: "invalid_credentials", message: "Invalid login credentials" });
    await render(<LoginScreen onCreateAccount={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "sam@example.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Invalid email or password")).toBeTruthy();
  });

  it("links to sign up", async () => {
    const onCreateAccount = jest.fn();
    await render(<LoginScreen onCreateAccount={onCreateAccount} />);
    await fireEvent.press(screen.getByRole("button", { name: "Create an account" }));
    expect(onCreateAccount).toHaveBeenCalled();
  });
});

describe("SignupScreen", () => {
  async function fill(overrides: Partial<Record<"Name" | "Email" | "Password" | "Confirm password", string>> = {}) {
    const values = {
      Name: "Sam",
      Email: "sam@example.com",
      Password: longPassword,
      "Confirm password": longPassword,
      ...overrides,
    };
    for (const [label, value] of Object.entries(values)) {
      await fireEvent.changeText(screen.getByLabelText(label), value);
    }
  }

  it("rejects a short password with the same message as the web app", async () => {
    await render(<SignupScreen onLogin={jest.fn()} />);
    await fill({ Password: "short", "Confirm password": "short" });
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Use at least 12 characters for your password.")).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("rejects passwords that don't match", async () => {
    await render(<SignupScreen onLogin={jest.fn()} />);
    await fill({ "Confirm password": "something else entirely" });
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Passwords don't match. Try again.")).toBeTruthy();
  });

  it("rejects a missing name and a bad email", async () => {
    await render(<SignupScreen onLogin={jest.fn()} />);
    await fill({ Name: " " });
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your name.")).toBeTruthy();

    await fill({ Email: "nope" });
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows the check-your-email message when confirmation is required", async () => {
    await render(<SignupScreen onLogin={jest.fn()} />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Check your email to confirm your account")).toBeTruthy();
    expect(screen.getByText(/sam@example\.com/)).toBeTruthy();
    expect(mockSignUp).toHaveBeenCalledWith("Sam", "sam@example.com", longPassword);
  });

  it("shows a friendly message when the account already exists", async () => {
    mockSignUp.mockRejectedValue({ code: "user_already_exists" });
    await render(<SignupScreen onLogin={jest.fn()} />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("An account with this email already exists. Try logging in."),
    ).toBeTruthy();
  });
});
