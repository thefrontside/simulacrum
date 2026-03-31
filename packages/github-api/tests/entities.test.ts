import { describe, it, expect } from "vitest";
import { convertInitialStateToStoreState, gitubInitialStoreSchema } from "../src/store/entities.ts";

const minimalInitialState = (userOverrides = {}) =>
  gitubInitialStoreSchema.parse({
    users: [{ login: "dev", organizations: [], ...userOverrides }],
    organizations: [{ login: "test-org" }],
    repositories: [{ owner: "test-org", name: "test-repo" }],
    branches: [{ name: "main" }],
    blobs: [],
  });

describe("initialState user fields", () => {
  it("preserves all provided fields through to store state", () => {
    const parsed = minimalInitialState({
      id: 99887766,
      name: "dev User",
      email: "dev@example.io",
    });
    const store = convertInitialStateToStoreState(parsed)!;
    const user = store.users["dev"];

    expect(user).toBeDefined();
    expect(user.id).toBe(99887766);
    expect(user.login).toBe("dev");
    expect(user.name).toBe("dev User");
    expect(user.email).toBe("dev@example.io");
  });

  it("generates defaults for omitted fields", () => {
    const parsed = minimalInitialState();
    const store = convertInitialStateToStoreState(parsed)!;
    const user = store.users["dev"];

    expect(user.id).toBeGreaterThanOrEqual(1000);
    expect(user.email).toContain("@");
  });
});
