import { z } from "zod";
import { type IdProp } from "@simulacrum/foundation-simulator";
import { faker } from "@faker-js/faker";

export const auth0UserSchema = z
  .object({
    id: z.string().default(() => faker.database.mongodbObjectId()),
    name: z.string(),
    password: z.string().optional().default("12345"),
    email: z.string().email().optional(),
    email_verified: z.boolean().default(true),
    picture: z.string().url().optional(),
    user_metadata: z.record(z.string(), z.unknown()).default({}),
    app_metadata: z.record(z.string(), z.unknown()).default({}),
    logins_count: z.number().int().nonnegative().default(0),
  })
  .transform((user) => {
    if (!user.email) user.email = faker.internet.email({ firstName: user.name });
    if (!user.picture) user.picture = faker.image.avatar();
    return user;
  });
export type Auth0User = z.infer<typeof auth0UserSchema>;

export type Metadata = Record<string, unknown>;

// Top-level merge as Auth0 does it: nested objects are replaced, and `null` removes a key.
export const mergeMetadata = (current: Metadata, update: unknown): Metadata => {
  if (!update || typeof update !== "object") return current;
  // a Map rather than assignment, so that a `__proto__` key is stored like any other
  let merged = new Map(Object.entries(current));
  for (let [key, value] of Object.entries(update)) {
    if (value === null) merged.delete(key);
    else merged.set(key, value);
  }
  return Object.fromEntries(merged);
};

// the database connection, unless the login came through another
export const identitiesOf = (
  user: Auth0User,
  connection = { name: "Username-Password-Authentication", strategy: "auth0" },
) => [
  {
    connection: connection.name,
    provider: connection.strategy,
    user_id: user.id.replace(/^auth0\|/, ""),
    isSocial: false,
  },
];
export const defaultUser = auth0UserSchema.parse({
  name: "default",
  email: "default@example.com",
});

export const auth0InitialStoreSchema = z.object({
  users: z.array(auth0UserSchema),
});
export type AuthSession = {
  username?: string;
  nonce: string;
  authorizeQuery?: Record<string, unknown>;
};
export type PasswordTicket = {
  id: string;
  userId: string;
  expiresAt: number;
  resultUrl?: string | undefined;
  markEmailAsVerified: boolean;
  // the email the ticket was made for
  email?: string | undefined;
};
export type Auth0Store = z.output<typeof auth0InitialStoreSchema> & {
  sessions: AuthSession[];
  passwordTickets: PasswordTicket[];
};
export type Auth0InitialStore = z.input<typeof auth0InitialStoreSchema>;

export const convertToObj = <T extends { [k: string]: any }>(
  arrayOfObjects: T[],
  key: IdProp = "id",
): Record<IdProp, T> =>
  arrayOfObjects.reduce(
    (final, obj: T) => {
      final[obj[key]] = obj;
      return final;
    },
    {} as Record<IdProp, T>,
  );

export const convertInitialStateToStoreState = (initialState: Auth0InitialStore | undefined) => {
  if (!initialState) return undefined;
  const storeObject = {
    users: convertToObj(initialState.users as Auth0Store["users"], "id"),
  };

  return storeObject;
};
