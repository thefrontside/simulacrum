import type { GitHubBlob } from "../store";

export const blobAsBase64 = ({
  blob,
  host,
  owner,
  repo,
  ref,
}: {
  blob: GitHubBlob;
  host: string;
  owner: string;
  repo: string;
  ref: string;
}) => ({
  content:
    blob.encoding === "base64"
      ? blob.content
      : Buffer.from(blob.content).toString("base64"),
  encoding: "base64",
  url: `${host}/repos/${owner}/${repo}/contents/${ref}`,
  sha: "-------",
  size: 9999,
  node_id: "node_id",
});

export const gitTrees = ({
  blobs,
  host,
  owner,
  repo,
  ref,
}: {
  blobs: GitHubBlob[];
  host: string;
  owner: string;
  repo: string;
  ref: string;
}) => {
  const tree = blobs.map((blob) => ({
    path: blob.path,
    mode: "100644",
    type: "blob",
    size: 9999,
    sha: blob.sha,
    // should be like /git/blobs/44b4fc6d56897b048c772eb4087f854f46256132,
    //  but just need to return a file with content in base64
    url: `${host}/repos/${blob.owner}/${blob.repo}/git/blobs/${blob.sha}`,
  }));

  return {
    sha: ref,
    url: `${host}/repos/${owner}/${repo}/trees/${ref}`,
    tree,
    truncated: false,
  };
};

export const commitStatusResponse = ({
  host,
  owner,
  repo,
  ref,
}: {
  host: string;
  owner: string;
  repo: string;
  ref: string;
}) => ({
  state: "success",
  statuses: [],
  sha: ref,
  total_count: 2,
  repository: {
    id: 1296269,
    node_id: "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
    name: repo,
    full_name: `${owner}/${repo}`,
    owner: {
      login: "octocat",
      id: 1,
      type: "User",
      site_admin: false,
    },
    private: false,
    description: "This your first repo!",
    fork: false,
    trees_url: `${host}/repos/${owner}/${repo}/git/trees{/sha}`,
    archive_url: `${host}/repos/${owner}/${repo}/{archive_format}{/ref}`,
  },
});
