import { z } from "zod";
import { convertObjToProp } from "@simulacrum/foundation-simulator";
import { faker } from "@faker-js/faker";

export const githubUserSchema = z
  .object({
    id: z.number().default(() => faker.number.int({ min: 1000 })),
    login: z.string(),
    name: z.string().optional(),
    bio: z.string().default(""),
    email: z.string().optional(),
    url: z.string().url().optional(),
    avatar_url: z.string().optional().default("https://github.com/images/error/octocat_happy.gif"),
    organizations: z.array(z.string()),
    created_at: z
      .string()
      .default(() => faker.date.recent().toISOString())
      .optional(),
  })
  .transform((user) => {
    if (!user.name) user.name = user.login;
    if (!user.email) user.email = faker.internet.email({ firstName: user.name });
    return user;
  });
export type GitHubUser = z.infer<typeof githubUserSchema>;

const githubEntityPermissionSchema = z
  .object({
    admin: z.boolean().optional().default(false),
    push: z.boolean().optional().default(false),
    pull: z.boolean().optional().default(true),
  })
  .optional()
  .default({ admin: false, push: false, pull: true });

export const githubAppInstallationSchema = z
  .object({
    id: z.number().default(2000),
    account: z.string(),
    repository_selection: z.enum(["all", "selected"]).optional().default("all"),
    app_id: z.number().default(1),
    access_tokens_url: z.string().optional(),
    repositories_url: z.string().optional(),
    html_url: z.string().optional(),
    client_id: z.string().optional().default("Iv1.ab1112223334445c"),
    target_id: z.number().optional(),
    target_type: z.enum(["Organization", "User"]).optional(),
    permissions: githubEntityPermissionSchema,
    events: z.array(z.any()).optional().default([]),
    updated_at: z
      .string()
      .optional()
      .default(() => faker.date.recent().toISOString()),
    created_at: z
      .string()
      .optional()
      .default(() => faker.date.recent().toISOString()),
    single_file_name: z.string().optional().default("config.yml"),
    has_multiple_single_files: z.boolean().optional().default(true),
    single_file_paths: z.array(z.string()).optional().default([]),
    app_slug: z.string().optional().default("simulator-app"),
    suspended_at: z.nullable(z.string()).optional().default(null),
    suspended_by: z.nullable(z.string()).optional().default(null),
  })
  .transform((install) => {
    install.id = faker.number.int({ min: 2000 });

    const host = "localhost:3300";
    // api endpoint
    install.access_tokens_url = `https://${host}/app/installations/1/access_tokens`;
    install.repositories_url = `https://${host}/installation/repositories`;
    // main site
    install.html_url = `https://${host}/organizations/github/settings/installations/1`;

    return install;
  });
export type GitHubAppInstallation = z.infer<typeof githubAppInstallationSchema>;

export const githubRepositorySchema = z
  .object({
    id: z.number().default(3000),
    node_id: z.string().optional(),
    name: z.string(),
    description: z.string().optional().default("Generic repository description"),
    owner: z.string(),
    full_name: z.string().optional().default(""),
    packages: z.array(z.string()).optional(),

    pushed_at: z
      .string()
      .optional()
      .default(() => faker.date.recent().toISOString()),
    updated_at: z
      .string()
      .optional()
      .default(() => faker.date.recent().toISOString()),
    created_at: z
      .string()
      .optional()
      .default(() => faker.date.recent().toISOString()),

    url: z.string().optional(),
    html_url: z.string().optional(),
    archive_url: z.string().optional(),
    assignees_url: z.string().optional(),
    blobs_url: z.string().optional(),
    branches_url: z.string().optional(),
    collaborators_url: z.string().optional(),
    comments_url: z.string().optional(),
    commits_url: z.string().optional(),
    compare_url: z.string().optional(),
    contents_url: z.string().optional(),
    contributors_url: z.string().optional(),
    deployments_url: z.string().optional(),
    downloads_url: z.string().optional(),
    events_url: z.string().optional(),
    forks_url: z.string().optional(),
    git_commits_url: z.string().optional(),
    git_refs_url: z.string().optional(),
    git_tags_url: z.string().optional(),
    git_url: z.string().optional(),
    issue_comment_url: z.string().optional(),
    issue_events_url: z.string().optional(),
    issues_url: z.string().optional(),
    keys_url: z.string().optional(),
    labels_url: z.string().optional(),
    languages_url: z.string().optional(),
    merges_url: z.string().optional(),
    milestones_url: z.string().optional(),
    notifications_url: z.string().optional(),
    pulls_url: z.string().optional(),
    releases_url: z.string().optional(),
    ssh_url: z.string().optional(),
    stargazers_url: z.string().optional(),
    statuses_url: z.string().optional(),
    subscribers_url: z.string().optional(),
    subscription_url: z.string().optional(),
    tags_url: z.string().optional(),
    teams_url: z.string().optional(),
    trees_url: z.string().optional(),
    clone_url: z.string().optional(),
    mirror_url: z.string().optional(),
    hooks_url: z.string().optional(),
    svn_url: z.string().optional(),

    homepage: z.string().optional(),
    language: z.nullable(z.string()).optional().default(null),
    default_branch: z.string().optional().default("main"),
    visibility: z.enum(["public", "private"]).default("public"),
    private: z.boolean().optional().default(false),
    license: z.nullable(z.record(z.string(), z.string())).default(null),
    fork: z.boolean().optional().default(false),
    topics: z.array(z.string()).optional().default([]),

    is_template: z.boolean().optional().default(false),
    has_issues: z.boolean().optional().default(true),
    has_projects: z.boolean().optional().default(true),
    has_wiki: z.boolean().optional().default(true),
    has_pages: z.boolean().optional().default(false),
    has_downloads: z.boolean().optional().default(true),
    has_discussions: z.boolean().optional().default(false),
    archived: z.boolean().optional().default(false),
    disabled: z.boolean().optional().default(false),

    forks_count: z.number().optional().default(9001),
    forks: z.number().optional().default(9001),
    stargazers_count: z.number().optional().default(9001),
    stargazers: z.number().optional().default(9001),
    watchers_count: z.number().optional().default(9001),
    watchers: z.number().optional().default(9001),
    size: z.number().optional().default(9001),
    open_issues_count: z.number().optional().default(9001),
    open_issues: z.number().optional().default(9001),

    permissions: githubEntityPermissionSchema,
    security_and_analysis: z
      .object({
        advanced_security: z
          .object({ status: z.string() })
          .optional()
          .default({ status: "enabled" }),
        secret_scanning: z.object({ status: z.string() }).optional().default({ status: "enabled" }),
        secret_scanning_push_protection: z
          .object({ status: z.string() })
          .optional()
          .default({ status: "enabled" }),
        secret_scanning_non_provider_patterns: z
          .object({ status: z.string() })
          .optional()
          .default({ status: "enabled" }),
      })
      .optional()
      .default({
        advanced_security: {
          status: "enabled",
        },
        secret_scanning: {
          status: "enabled",
        },
        secret_scanning_push_protection: {
          status: "disabled",
        },
        secret_scanning_non_provider_patterns: {
          status: "disabled",
        },
      }),
  })
  .transform((repo) => {
    repo.id = faker.number.int({ min: 3000 });
    repo.node_id = repo.name;
    repo.full_name = `${repo.owner}/${repo.name}`;

    const host = "localhost:3300";
    repo.url = `http://${host}/repos/${repo.full_name}`;
    repo.html_url = `http://${host}/repos/${repo.full_name}`;
    repo.archive_url = `http://${host}/repos/${repo.full_name}/{archive_format}{/ref}`;
    repo.assignees_url = `http://${host}/repos/${repo.full_name}/assignees{/user}`;
    repo.blobs_url = `http://${host}/repos/${repo.full_name}/git/blobs{/sha}`;
    repo.branches_url = `http://${host}/repos/${repo.full_name}/branches{/branch}`;
    repo.collaborators_url = `http://${host}/repos/${repo.full_name}/collaborators{/collaborator}`;
    repo.comments_url = `http://${host}/repos/${repo.full_name}/comments{/number}`;
    repo.commits_url = `http://${host}/repos/${repo.full_name}/commits{/sha}`;
    repo.compare_url = `http://${host}/repos/${repo.full_name}/compare/{base}...{head}`;
    repo.contents_url = `http://${host}/repos/${repo.full_name}/contents/{+path}`;
    repo.contributors_url = `http://${host}/repos/${repo.full_name}/contributors`;
    repo.deployments_url = `http://${host}/repos/${repo.full_name}/deployments`;
    repo.downloads_url = `http://${host}/repos/${repo.full_name}/downloads`;
    repo.events_url = `http://${host}/repos/${repo.full_name}/events`;
    repo.forks_url = `http://${host}/repos/${repo.full_name}/forks`;
    repo.git_commits_url = `http://${host}/repos/${repo.full_name}/git/commits{/sha}`;
    repo.git_refs_url = `http://${host}/repos/${repo.full_name}/git/refs{/sha}`;
    repo.git_tags_url = `http://${host}/repos/${repo.full_name}/git/tags{/sha}`;
    repo.git_url = `git:github.com/${repo.full_name}.git`;
    repo.issue_comment_url = `http://${host}/repos/${repo.full_name}/issues/comments{/number}`;
    repo.issue_events_url = `http://${host}/repos/${repo.full_name}/issues/events{/number}`;
    repo.issues_url = `http://${host}/repos/${repo.full_name}/issues{/number}`;
    repo.keys_url = `http://${host}/repos/${repo.full_name}/keys{/key_id}`;
    repo.labels_url = `http://${host}/repos/${repo.full_name}/labels{/name}`;
    repo.languages_url = `http://${host}/repos/${repo.full_name}/languages`;
    repo.merges_url = `http://${host}/repos/${repo.full_name}/merges`;
    repo.milestones_url = `http://${host}/repos/${repo.full_name}/milestones{/number}`;
    repo.notifications_url = `http://${host}/repos/${repo.full_name}/notifications{?since,all,participating}`;
    repo.pulls_url = `http://${host}/repos/${repo.full_name}/pulls{/number}`;
    repo.releases_url = `http://${host}/repos/${repo.full_name}/releases{/id}`;
    repo.ssh_url = `git@github.com:${repo.full_name}.git`;
    repo.stargazers_url = `http://${host}/repos/${repo.full_name}/stargazers`;
    repo.statuses_url = `http://${host}/repos/${repo.full_name}/statuses/{sha}`;
    repo.subscribers_url = `http://${host}/repos/${repo.full_name}/subscribers`;
    repo.subscription_url = `http://${host}/repos/${repo.full_name}/subscription`;
    repo.tags_url = `http://${host}/repos/${repo.full_name}/tags`;
    repo.teams_url = `http://${host}/repos/${repo.full_name}/teams`;
    repo.trees_url = `http://${host}/repos/${repo.full_name}/git/trees{/sha}`;
    repo.clone_url = `http://github.com/${repo.full_name}.git`;
    repo.mirror_url = `git:git.example.com/${repo.full_name}`;
    repo.hooks_url = `http://${host}/repos/${repo.full_name}/hooks`;
    repo.svn_url = `http://svn.github.com/${repo.full_name}`;

    repo.homepage = `http://${host}`;
    repo.topics = ["octocat", "boilerplate", "tauri", "api"];

    return repo;
  });
export type GitHubRepository = z.infer<typeof githubRepositorySchema>;

export const githubBranchSchema = z.object({
  name: z.string().optional().default("main"),
  commit: z.object({ sha: z.string().optional(), url: z.string().optional() }).default({
    sha: faker.git.commitSha(),
    // @ts-expect-error
    url: `https://api.github.com/repos/octocat/Hello-World/commits/${this?.sha}`,
  }),
  protected: z.boolean().optional().default(true),
  protection: z.any().optional(),
  protection_url: z
    .string()
    .optional()
    .default("https://api.github.com/repos/octocat/hello-world/branches/master/protection"),
});
export type GitHubBranch = z.infer<typeof githubBranchSchema>;

export const githubOrganizationSchema = z
  .object({
    id: z.number().default(4000),
    login: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    node_id: z.string().optional(),
    type: z.enum(["User", "Organization"]).default("Organization"),
    description: z.string().optional().default("Generic org description"),
    created_at: z
      .string()
      .default(() => faker.date.recent().toISOString())
      .optional(),

    teams: z.union([z.array(z.string()), z.undefined()]),
    avatar_url: z.string().optional().default("https://github.com/images/error/octocat_happy.gif"),
    gravatar_id: z.string().optional().default(""),
    site_admin: z.boolean().optional().default(true),
    url: z.string().url().optional(),
    html_url: z.string().optional(),
    followers_url: z.string().optional(),
    following_url: z.string().optional(),
    gists_url: z.string().optional(),
    starred_url: z.string().optional(),
    subscriptions_url: z.string().optional(),
    organizations_url: z.string().optional(),
    repos_url: z.string().optional(),
    events_url: z.string().optional(),
    received_events_url: z.string().optional(),
    hooks_url: z.string().optional(),
    issues_url: z.string().optional(),
    members_url: z.string().optional(),
    public_members_url: z.string().optional(),
  })
  .transform((org) => {
    org.id = faker.number.int({ min: 4000 });
    if (!org?.name) org.name = org.login;
    if (!org.email)
      org.email = faker.internet.email({
        firstName: "org",
        lastName: org.login,
      });

    const host = "localhost:3300";
    org.url = `http://${host}/orgs/${org.login}`;
    org.html_url = `http://github.com/${org.login}`;
    org.followers_url = `http://${host}/users/${org.login}/followers`;
    org.following_url = `http://${host}/users/${org.login}/following{/other_user}`;
    org.gists_url = `http://${host}/users/${org.login}/gists{/gist_id}`;
    org.starred_url = `http://${host}/users/${org.login}/starred{/owner}{/repo}`;
    org.subscriptions_url = `http://${host}/users/${org.login}/subscriptions`;
    org.organizations_url = `http://${host}/users/${org.login}/orgs`;
    org.repos_url = `http://${host}/users/${org.login}/repos`;
    org.events_url = `http://${host}/users/${org.login}/events{/privacy}`;
    org.received_events_url = `http://${host}/users/${org.login}/received_events`;

    org.repos_url = `${org.url}/repos`;
    org.events_url = `${org.url}/events`;
    org.hooks_url = `${org.url}/hooks`;
    org.issues_url = `${org.url}/issues`;
    org.members_url = `${org.url}/members{/member}`;
    org.public_members_url = `${org.url}/public_members{/member}`;

    org.node_id = "MDQ6VXNlcjE=";

    return org;
  });
export type GitHubOrganization = z.infer<typeof githubOrganizationSchema>;

export const githubBlobSchema = z
  .object({
    content: z.string().optional().default(faker.lorem.paragraphs),
    encoding: z.union([z.literal("string"), z.literal("base64")]).default("string"),
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

    return blob;
  });
export type GitHubBlob = z.infer<typeof githubBlobSchema>;

export const gitubInitialStoreSchema = z
  .object({
    users: z.array(githubUserSchema),
    installations: z.array(githubAppInstallationSchema).optional().default([]),
    organizations: z.array(githubOrganizationSchema),
    repositories: z.array(githubRepositorySchema),
    branches: z.array(githubBranchSchema),
    blobs: z.array(githubBlobSchema),
  })
  .transform((initialStore) => {
    initialStore.installations = initialStore.organizations.map((org) => {
      return githubAppInstallationSchema.parse({
        account: org.login,
        target_id: org.id,
        target_type: org.type,
      });
    });
    return initialStore;
  });
export type GitHubStore = z.output<typeof gitubInitialStoreSchema>;
export type GitHubInitialStore = z.input<typeof gitubInitialStoreSchema>;

export const convertInitialStateToStoreState = (initialState: GitHubStore | undefined) => {
  if (!initialState) return undefined;
  const storeObject = {
    users: convertObjToProp(initialState.users, "login"),
    installations: convertObjToProp(initialState.installations, "id"),
    repositories: convertObjToProp(initialState.repositories, "name"),
    branches: convertObjToProp(initialState.branches, "name"),
    organizations: convertObjToProp(initialState.organizations, "login"),
    blobs: convertObjToProp(initialState.blobs),
  };

  return storeObject;
};
