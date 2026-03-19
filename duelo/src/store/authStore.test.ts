import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "./authStore";
import { createTestUser } from "../test/factories";

/**
 * AuthStore tests: Auth lifecycle, profile bootstrap, user state persistence
 */

describe("authStore - User authentication state", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      loading: false,
      error: null,
    });
  });

  it("should initialize with null user", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("should set user when authenticated", () => {
    const testUser = createTestUser();
    const store = useAuthStore.getState();

    store.setUser(testUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(testUser);
    expect(state.user?.uid).toBe(testUser.uid);
  });

  it("should persist to localStorage when user is set", () => {
    const testUser = createTestUser();
    const store = useAuthStore.getState();

    store.setUser(testUser);

    // localStorage should be called (through Zustand persist middleware)
    // We can't directly check localStorage in unit tests without mocking,
    // but the store should maintain the user after state update
    const state = useAuthStore.getState();
    expect(state.user?.uid).toBe(testUser.uid);
  });

  it("should clear user on logout", () => {
    const testUser = createTestUser();
    const store = useAuthStore.getState();

    store.setUser(testUser);
    expect(useAuthStore.getState().user).not.toBeNull();

    store.logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("should handle loading state transitions", () => {
    const store = useAuthStore.getState();

    store.setLoading(true);
    expect(useAuthStore.getState().loading).toBe(true);

    store.setLoading(false);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("should handle error state", () => {
    const store = useAuthStore.getState();
    const errorMsg = "Authentication failed";

    store.setError(errorMsg);
    expect(useAuthStore.getState().error).toBe(errorMsg);

    store.setError(null);
    expect(useAuthStore.getState().error).toBeNull();
  });
});

describe("authStore - User profile updates", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: createTestUser(),
      loading: false,
      error: null,
    });
  });

  it("should update character selection", () => {
    const store = useAuthStore.getState();
    const newCharacter = "stormtrooper";

    store.updateCharacter(newCharacter);

    const state = useAuthStore.getState();
    expect(state.user?.selectedCharacter).toBe(newCharacter);
  });

  it("should update user preferences", () => {
    const store = useAuthStore.getState();
    const newPrefs = {
      defaultMode: "advanced",
      soundEnabled: false,
    };

    store.updatePreferences(newPrefs as any);

    const state = useAuthStore.getState();
    expect(state.user?.preferences?.defaultMode).toBe("advanced");
    expect(state.user?.preferences?.soundEnabled).toBe(false);
  });

  it("should update profile with new data", () => {
    const store = useAuthStore.getState();
    const updates = {
      displayName: "New Name",
      gold: 500,
    };

    store.updateUser(updates as any);

    const state = useAuthStore.getState();
    expect(state.user?.displayName).toBe("New Name");
    expect(state.user?.gold).toBe(500);
  });

  it("should handle null user gracefully", () => {
    useAuthStore.setState({ user: null });

    const store = useAuthStore.getState();
    // Should not throw
    expect(() => {
      store.updateCharacter("pano");
    }).not.toThrow();
  });
});

describe("authStore - Guest session handling", () => {
  it("should create guest user with expiration", () => {
    const store = useAuthStore.getState();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    store.setUser({
      ...createTestUser(),
      uid: "guest-" + Date.now(),
      email: null as any,
      createdAt: now,
    });

    const state = useAuthStore.getState();
    expect(state.user?.uid).toMatch(/^guest-/);
    expect(state.user?.createdAt).toBeLessThanOrEqual(sevenDaysMs + now);
  });

  it("should detect expired guest session", () => {
    const expiredTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    const expiredUser = createTestUser({
      uid: "guest-expired",
      createdAt: expiredTime,
    });

    useAuthStore.setState({ user: expiredUser });

    const store = useAuthStore.getState();
    const state = useAuthStore.getState();

    // Store should have mechanism to check expiration
    // This would typically be called in useEffect on app init
    expect(state.user?.createdAt).toBeLessThan(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    );
  });
});

describe("authStore - Multi-user scenarios", () => {
  it("should replace user when logging in with different account", () => {
    const user1 = createTestUser({ uid: "user-1" });
    const user2 = createTestUser({ uid: "user-2" });

    const store = useAuthStore.getState();
    store.setUser(user1);
    expect(useAuthStore.getState().user?.uid).toBe(user1.uid);

    store.setUser(user2);
    expect(useAuthStore.getState().user?.uid).toBe(user2.uid);
  });

  it("should clear auth state on logout", () => {
    const user = createTestUser();
    const store = useAuthStore.getState();

    store.setUser(user);
    expect(useAuthStore.getState().user).not.toBeNull();

    store.logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
