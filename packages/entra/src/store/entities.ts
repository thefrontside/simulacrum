import { z } from "zod";
import { type IdProp } from "@simulacrum/foundation-simulator";
import { faker } from "@faker-js/faker";

// A GUID-shaped identifier, mirroring Entra's `oid`/`sub` claims.
const guid = () => faker.string.uuid();

export const entraUserSchema = z
  .object({
    // `oid` in Entra: the immutable object id for the user in the directory.
    id: z.string().default(guid),
    name: z.string(),
    password: z.string().optional().default("12345"),
    email: z.string().email().optional(),
    // `preferred_username` in the id token; defaults to the email.
    preferredUsername: z.string().optional(),
  })
  .transform((user) => {
    if (!user.email) user.email = faker.internet.email({ firstName: user.name });
    if (!user.preferredUsername) user.preferredUsername = user.email;
    return user;
  });
export type EntraUser = z.infer<typeof entraUserSchema>;

export const defaultUser = entraUserSchema.parse({
  id: "0e8a3b8a-1111-4000-a000-0000000000cd",
  name: "Default User",
  email: "default@example.com",
});

export const entraInitialStoreSchema = z.object({
  users: z.array(entraUserSchema),
});
export type EntraStore = z.output<typeof entraInitialStoreSchema>;
export type EntraInitialStore = z.input<typeof entraInitialStoreSchema>;

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

export const convertInitialStateToStoreState = (initialState: EntraInitialStore | undefined) => {
  if (!initialState) return undefined;
  const storeObject = {
    users: convertToObj(initialState.users as EntraStore["users"], "id"),
  };

  return storeObject;
};
