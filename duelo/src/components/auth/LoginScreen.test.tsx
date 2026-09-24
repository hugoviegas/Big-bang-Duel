import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";

const mockNavigate = vi.fn();
const mockSetUser = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInAnonymously = vi.fn();
const mockUpdateProfile = vi.fn();
const mockGenerateUniquePlayerCode = vi.fn();
const mockCreatePlayerProfile = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  GoogleAuthProvider: class GoogleAuthProvider {},
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

vi.mock("../../lib/firebase", () => ({
  auth: { app: "test-auth" },
}));

vi.mock("../../lib/firebaseService", () => ({
  generateUniquePlayerCode: (...args: unknown[]) =>
    mockGenerateUniquePlayerCode(...args),
  createPlayerProfile: (...args: unknown[]) => mockCreatePlayerProfile(...args),
}));

vi.mock("../../store/authStore", () => {
  const useAuthStoreMock = Object.assign(
    vi.fn(() => ({
      setUser: mockSetUser,
    })),
    {
      getState: vi.fn(() => ({ user: null })),
    },
  );

  return { useAuthStore: useAuthStoreMock };
});

describe("LoginScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows registration fields when toggling register mode", () => {
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );

    expect(
      screen.queryByPlaceholderText("Ex: Billy The Kid"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Novo por aqui? Criar conta." }),
    );

    expect(
      screen.getByPlaceholderText("Ex: Billy The Kid"),
    ).toBeInTheDocument();
  });

  it("logs in with email and navigates to menu", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "uid-123",
        email: "user@test.com",
        displayName: "Billy",
      },
    });

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("pistoleiro@oeste.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••"), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ENTRAR" }));

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/menu", { replace: true });
    });
  });

  it("shows mapped auth error message for invalid credentials", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/wrong-password",
    });

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("pistoleiro@oeste.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••"), {
      target: { value: "wrong123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ENTRAR" }));

    expect(
      await screen.findByText("Email ou senha incorretos."),
    ).toBeInTheDocument();
  });

  it("allows guest login and marks session as guest", async () => {
    mockSignInAnonymously.mockResolvedValue({
      user: { uid: "guest-uid" },
    });

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "ENTRAR COMO CONVIDADO" }),
    );

    await waitFor(() => {
      expect(mockSignInAnonymously).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: "guest-uid",
          isGuest: true,
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/menu", { replace: true });
    });
  });

  it("logs in with Google from an explicit click without creating a profile", async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: {
        uid: "google-uid",
        email: "google@test.com",
        displayName: "Google Player",
      },
    });

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));

    await waitFor(() => {
      expect(mockSignInWithPopup).toHaveBeenCalledWith(
        { app: "test-auth" },
        expect.anything(),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/menu", { replace: true });
    });
    expect(mockCreatePlayerProfile).not.toHaveBeenCalled();
  });

  it("shows a friendly message when Google login is cancelled", async () => {
    mockSignInWithPopup.mockRejectedValue({
      code: "auth/popup-closed-by-user",
    });

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));

    expect(
      await screen.findByText(
        "Login cancelado. Tente novamente quando estiver pronto.",
      ),
    ).toBeInTheDocument();
  });

  it("prevents repeated Google submissions while the request is pending", async () => {
    let resolveLogin: (() => void) | undefined;
    mockSignInWithPopup.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );

    const googleButton = screen.getByRole("button", { name: "Entrar com Google" });
    fireEvent.click(googleButton);
    fireEvent.click(googleButton);

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);

    resolveLogin?.();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/menu", { replace: true });
    });
  });
});
