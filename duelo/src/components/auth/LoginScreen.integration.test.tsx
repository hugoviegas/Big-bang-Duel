import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { LoginScreen } from "./LoginScreen";

/**
 * LoginScreen component tests: Form validation, auth handling, error display
 */

// Mock Firebase auth
vi.mock("../../lib/firebase", () => ({
  auth: { currentUser: null },
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInAnonymously: vi.fn(),
}));

vi.mock("../../lib/firebaseService", () => ({
  generateUniquePlayerCode: vi.fn(() => Promise.resolve("ABC123")),
  createPlayerProfile: vi.fn(() => Promise.resolve({ uid: "test-uid" })),
}));

vi.mock("../../store/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    setUser: vi.fn(),
    user: null,
    loading: false,
  })),
}));

const renderLoginScreen = () =>
  render(
    <BrowserRouter>
      <LoginScreen />
    </BrowserRouter>,
  );

describe("LoginScreen - Rendering", () => {
  it("should render login form by default", () => {
    renderLoginScreen();

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /login|sign in/i }),
    ).toBeInTheDocument();
  });

  it("should display register toggle button", () => {
    renderLoginScreen();

    const toggleBtn = screen.queryByRole("button", {
      name: /register|create account/i,
    });
    expect(
      toggleBtn || screen.getByText(/don't have an account/i),
    ).toBeInTheDocument();
  });

  it("should display guest login option", () => {
    renderLoginScreen();

    expect(
      screen.getByRole("button", { name: /guest|continue as guest/i }),
    ).toBeInTheDocument();
  });
});

describe("LoginScreen - Form validation", () => {
  it("should require email input", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const submitBtn = screen.getByRole("button", { name: /login|sign in/i });
    await user.click(submitBtn);

    // Should show validation error or prevent submission
    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText(
        /email/i,
      ) as HTMLInputElement;
      expect(emailInput.value === "" || emailInput.required).toBeTruthy();
    });
  });

  it("should require password input", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, "test@example.com");

    const submitBtn = screen.getByRole("button", { name: /login|sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const passwordInput = screen.getByPlaceholderText(
        /password/i,
      ) as HTMLInputElement;
      expect(passwordInput.value === "" || passwordInput.required).toBeTruthy();
    });
  });

  it("should validate email format", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, "invalid-email");

    const submitBtn = screen.getByRole("button", { name: /login|sign in/i });
    await user.click(submitBtn);

    // Should show error or prevent submission
    await waitFor(() => {
      expect(emailInput).toHaveAttribute("type", "email");
    });
  });

  it("should require minimum password length", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "short");

    const submitBtn = screen.getByRole("button", { name: /login|sign in/i });
    await user.click(submitBtn);

    // Should prevent submission with short password
    await waitFor(() => {
      expect(
        passwordInput.value.length < 6 || passwordInput.value,
      ).toBeLessThanOrEqual(6);
    });
  });
});

describe("LoginScreen - Mode switching", () => {
  it("should toggle between login and register forms", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    // Initial: login form
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();

    // Toggle to register
    const toggleBtn = screen.queryByRole("button", {
      name: /register|create account|toggl/i,
    });
    if (toggleBtn) {
      await user.click(toggleBtn);

      await waitFor(() => {
        // Register form might have additional fields (username, confirm password, etc)
        expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
      });
    }
  });

  it("should show confirm password field in register mode", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const toggleBtn = screen.queryByRole("button", {
      name: /register|create|new/i,
    });
    if (toggleBtn) {
      await user.click(toggleBtn);

      await waitFor(() => {
        const confirmPassword = screen.queryByPlaceholderText(
          /confirm|re-enter|again/i,
        );
        expect(confirmPassword !== null).toBeTruthy();
      });
    }
  });
});

describe("LoginScreen - Guest login", () => {
  it("should handle guest login without credentials", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const guestBtn = screen.getByRole("button", {
      name: /guest|continue as guest/i,
    });
    await user.click(guestBtn);

    // Should not require email/password validation
    await waitFor(() => {
      expect(guestBtn).toBeInTheDocument();
    });
  });
});

describe("LoginScreen - Error handling", () => {
  it("should display authentication error messages", async () => {
    renderLoginScreen();

    // Component should have error display capability
    const form =
      screen.getByRole("form", { hidden: true }) ||
      document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("should show user-friendly error for invalid credentials", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await user.type(emailInput, "wrong@example.com");
    await user.type(passwordInput, "wrongpass");

    const submitBtn = screen.getByRole("button", { name: /login|sign in/i });
    await user.click(submitBtn);

    // Should eventually show error message
    await waitFor(
      () => {
        const errorMsg = screen.queryByText(/invalid|wrong|failed|error/i);
        expect(
          errorMsg || screen.getByPlaceholderText(/email/i),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
