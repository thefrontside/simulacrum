import { z } from "zod";
import { type IdProp } from "@simulacrum/foundation-simulator";
import { faker } from "@faker-js/faker";

export const auth0UserSchema = z
  .object({
    id: z.string().default(() => faker.database.mongodbObjectId()),
    name: z.string(),
    password: z.string().optional().default("12345"),
    email: z.string().email().optional(),
    picture: z.string().url().optional(),
  })
  .transform((user) => {
    if (!user.email) user.email = faker.internet.email({ firstName: user.name });
    if (!user.picture) user.picture = faker.image.avatar();
    return user;
  });
export type Auth0User = z.infer<typeof auth0UserSchema>;
export const defaultUser = auth0UserSchema.parse({
  name: "default",
  email: "default@example.com",
});

export const auth0InitialStoreSchema = z.object({
  users: z.array(auth0UserSchema),
});
export type AuthSession = { username: string; nonce: string };
export type Auth0Store = z.output<typeof auth0InitialStoreSchema> & {
  sessions: AuthSession[];
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
