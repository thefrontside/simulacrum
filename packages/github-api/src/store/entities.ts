import { z } from "zod";
import { IdProp } from "@simulacrum/foundation-simulator";
import { faker } from "@faker-js/faker";

export const githubUserSchema = z
  .object({
    id: z.string().or(z.number()).default(""),
    login: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    organizations: z.array(z.string()),
  })
  .transform((user) => {
    user.id = user.login;
    if (!user.name) user.name = user.login;
    if (!user.email)
      user.email = faker.internet.email({ firstName: user.name });
    return user;
  });
export type GitHubUser = z.infer<typeof githubUserSchema>;

export const githubRepositorySchema = z
  .object({
    id: z.string().or(z.number()).default(""),
    name: z.string(),
    packages: z.array(z.string()).optional(),
  })
  .transform((repo) => {
    repo.id = repo.name;
    return repo;
  });
export type GitHubRepository = z.infer<typeof githubRepositorySchema>;

export const githubOrganizationSchema = z
  .object({
    id: z.string().or(z.number()).default(""),
    login: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    description: z.string().optional(),
    created_at: z
      .string()
      .default(() => faker.date.recent().toISOString())
      .optional(),
    teams: z.union([z.array(z.string()), z.undefined()]),
  })
  .transform((org) => {
    org.id = org.login;
    if (!org?.name) org.name = org.login;
    if (!org.email)
      org.email = faker.internet.email({
        firstName: "org",
        lastName: org.login,
      });
    return org;
  });
export type GitHubOrganization = z.infer<typeof githubOrganizationSchema>;

export const githubBlobSchema = z
  .object({
    id: z.string().or(z.number()).default(""),
    content: z.string().optional().default(faker.lorem.paragraphs),
    encoding: z
      .union([z.literal("string"), z.literal("base64")])
      .default("string"),
    owner: z.string(),
    repo: z.string(),
    // below we ensure that one of these is specified, but the other is then optional
    path: z.string(),
    sha: z.string(),
  })
  .transform((blob, ctx) => {
    if (!blob.path && !blob.sha) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Specify the path or sha of the blob",
      });
      return z.NEVER;
    }

    blob.id = `${blob.owner}/${blob.repo}/${blob?.path ?? blob.sha ?? "00000"}`;
    return blob;
  });
export type GitHubBlob = z.infer<typeof githubBlobSchema>;

export const gitubInitialStoreSchema = z.object({
  users: z.array(githubUserSchema),
  repositories: z.array(githubRepositorySchema),
  organizations: z.array(githubOrganizationSchema),
  blobs: z.array(githubBlobSchema),
});
export type GitHubStore = z.output<typeof gitubInitialStoreSchema>;
export type GitHubInitialStore = z.input<typeof gitubInitialStoreSchema>;

export const convertToObj = <T extends { id: IdProp; [k: string]: any }>(
  arrayOfObjects: T[]
): Record<IdProp, T> =>
  arrayOfObjects.reduce((final, obj: T) => {
    final[obj.id] = obj;
    return final;
  }, {} as Record<IdProp, T>);

export const convertInitialStateToStoreState = (
  initialState: GitHubStore | undefined
) => {
  if (!initialState) return undefined;
  // TODO try to make this generic?
  const storeObject = {
    users: convertToObj(initialState.users),
    repositories: convertToObj(initialState.repositories),
    organizations: convertToObj(initialState.organizations),
    blobs: convertToObj(initialState.blobs),
  };

  return storeObject;
};
