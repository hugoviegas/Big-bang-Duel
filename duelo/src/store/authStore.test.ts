import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";
import { createTestUser } from "../test/factories";

/**
 * AuthStore tests: Auth lifecycle, user state management
 */

describe("authStore - State management", () => {
  it("should have initial state defined", () => {
    const state = useAuthStore.getState();
    expect(state).toBeDefined();
    expect(typeof state.isLoading).toBe("boolean");
  });

  it("should have methods defined", () => {
    const state = useAuthStore.getState();
    expect(typeof state.setUser).toBe("function");
    expect(typeof state.logout).toBe("function");
    expect(typeof state.setLoading).toBe("function");
  });
});

describe("authStore - Loading state", () => {
  it("should toggle loading state", () => {
    const store = useAuthStore.getState();

    store.setLoading(true);
    let state = useAuthStore.getState();
    expect(state.isLoading).toBe(true);

    store.setLoading(false);
    state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
  });
});

describe("authStore - Character updates", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: createTestUser(),
      isLoading: false,
    });
  });

  it("should update character selection", () => {
    const store = useAuthStore.getState();
    store.updateCharacter("stormtrooper");

    const state = useAuthStore.getState();
    expect(state.user?.avatar).toBe("stormtrooper");
  });

  it("should update preferences", () => {
    const store = useAuthStore.getState();
    const prefs = { defaultMode: "advanced", soundEnabled: false };

    store.updatePreferences(prefs as any);

    const state = useAuthStore.getState();
    expect(state.user?.preferences?.defaultMode).toBe("advanced");
  });
});

describe("authStore - Logout", () => {
  it("should clear user on logout", () => {
    const user = createTestUser();
    useAuthStore.setState({ user });

    const store = useAuthStore.getState();
    store.logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });
});
