import { describe, it, expect } from "vitest";
import { auth0InitialStoreSchema, convertInitialStateToStoreState } from "../src/store/entities.ts";

describe("initialState user fields", () => {
  it("preserves all provided fields through to store state", () => {
    const parsed = auth0InitialStoreSchema.parse({
      users: [
        {
          id: "auth0|230984023984023904",
          name: "dev",
          email: "dev@example.io",
          password: "secret",
          picture: "https://example.com/avatar.png",
        },
      ],
    });
    const store = convertInitialStateToStoreState(parsed)!;
    const user = store.users["auth0|230984023984023904"];

    expect(user).toBeDefined();
    expect(user.id).toBe("auth0|230984023984023904");
    expect(user.name).toBe("dev");
    expect(user.email).toBe("dev@example.io");
    expect(user.password).toBe("secret");
    expect(user.picture).toBe("https://example.com/avatar.png");
  });

  it("generates defaults for omitted fields", () => {
    const parsed = auth0InitialStoreSchema.parse({
      users: [{ name: "dev" }],
    });
    const store = convertInitialStateToStoreState(parsed)!;
    const user = Object.values(store.users)[0];

    expect(user.id).toBeTruthy();
    expect(user.email).toContain("@");
  });

  it("keeps user_metadata and app_metadata", () => {
    const parsed = auth0InitialStoreSchema.parse({
      users: [
        {
          name: "dev",
          user_metadata: { theme: "dark" },
          app_metadata: { organisation_id: "org_123", roles: ["admin"] },
        },
      ],
    });
    const user = Object.values(convertInitialStateToStoreState(parsed)!.users)[0];

    expect(user.user_metadata).toEqual({ theme: "dark" });
    expect(user.app_metadata).toEqual({ organisation_id: "org_123", roles: ["admin"] });
  });

  it("defaults metadata to empty objects", () => {
    const parsed = auth0InitialStoreSchema.parse({ users: [{ name: "dev" }] });
    const user = Object.values(convertInitialStateToStoreState(parsed)!.users)[0];

    expect(user.user_metadata).toEqual({});
    expect(user.app_metadata).toEqual({});
  });
});
