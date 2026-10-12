import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { actionSchema, type ActionConfig } from "../types.ts";
import { mergeMetadata, type Metadata } from "../store/entities.ts";

// The subset of Auth0's post-login trigger that the simulator provides.
// https://auth0.com/docs/customize/actions/explore-triggers/post-login

export interface PostLoginEvent {
  user: {
    user_id: string;
    email?: string | undefined;
    email_verified: boolean;
    name?: string | undefined;
    nickname?: string | undefined;
    picture?: string | undefined;
    // https://auth0.com/docs/manage-users/user-accounts/metadata
    user_metadata: Metadata;
    app_metadata: Metadata;
    identities: { provider: string; user_id: string; connection: string; isSocial: boolean }[];
  };
  secrets: Record<string, string>;
  request: {
    query: Record<string, unknown>;
    ip?: string | undefined;
    hostname?: string | undefined;
    method?: string | undefined;
    user_agent?: string | undefined;
  };
  authorization: { roles: string[] };
  resource_server: { identifier: string };
  stats: { logins_count: number };
  client: { client_id: string };
  connection: { name: string; strategy: string };
  transaction: { protocol: string; requested_scopes: string[] };
}

export interface PostLoginResult {
  idTokenClaims: Record<string, unknown>;
  accessTokenClaims: Record<string, unknown>;
  // the keys actions set, with `null` for a removed key, present only when an action set one
  userMetadata?: Metadata;
  appMetadata?: Metadata;
  denied?: string;
  error?: unknown;
}

export interface ActionsRunner {
  postLogin(event: Omit<PostLoginEvent, "secrets">): Promise<PostLoginResult>;
}

type PostLoginHandler = (event: PostLoginEvent, api: unknown) => unknown;

interface LoadedAction {
  secrets: Record<string, string>;
  cache: ReturnType<typeof createCache>;
  onExecutePostLogin?: PostLoginHandler | undefined;
}

type CacheRecord = { value: unknown; expires_at?: number | undefined };

// api.cache lives for the simulation, shared by every execution of the same action
const createCache = () => {
  let records = new Map<string, CacheRecord>();
  let live = (key: string) => {
    let record = records.get(key);
    if (record?.expires_at !== undefined && record.expires_at <= Date.now()) {
      records.delete(key);
      return undefined;
    }
    return record;
  };

  return {
    get: (key: string) => {
      let record = live(key);
      return record && { ...record };
    },
    set: (key: string, value: unknown, options: { ttl?: number; expires_at?: number } = {}) => {
      let expires_at =
        options.expires_at ?? (options.ttl === undefined ? undefined : Date.now() + options.ttl);
      let record = { value, expires_at };
      records.set(key, record);
      return { type: "success", record: { ...record } };
    },
    delete: (key: string) => {
      let record = live(key);
      records.delete(key);
      return { type: "success", record };
    },
  };
};

// Evaluated like a CommonJS module in this process, as Auth0's Node runtime would,
// so actions get the real globals (fetch, Buffer, ...) and `require` relative to their file.
const loadAction = (config: ActionConfig, index: number): LoadedAction => {
  let { file, code, name, secrets = {} } = actionSchema.parse(config);
  let filename = path.resolve(file ?? `${name ?? `action-${index}`}.js`);
  let source = code ?? fs.readFileSync(filename, "utf8");

  let module = { exports: {} as { onExecutePostLogin?: PostLoginHandler } };
  let evaluate = vm.compileFunction(
    source,
    ["exports", "require", "module", "__filename", "__dirname"],
    { filename },
  );
  evaluate(module.exports, createRequire(filename), module, filename, path.dirname(filename));

  return { secrets, cache: createCache(), onExecutePostLogin: module.exports.onExecutePostLogin };
};

// Auth0 ignores custom claims that would overwrite these
const registeredClaims = new Set(["iss", "sub", "aud", "exp", "nbf", "iat", "jti"]);

const setClaim = (claims: Record<string, unknown>, name: string, value: unknown) => {
  if (registeredClaims.has(name)) console.warn(`ignoring the restricted claim "${name}"`);
  else claims[name] = value;
};

export function createActionsRunner(actions: ActionConfig[] | undefined): ActionsRunner {
  let loaded = (actions ?? []).map(loadAction);

  return {
    async postLogin(input) {
      // actions see each other's metadata changes, but not the store's copy
      let user = structuredClone(input.user);
      let result: PostLoginResult = { idTokenClaims: {}, accessTokenClaims: {} };

      for (let action of loaded) {
        if (!action.onExecutePostLogin) continue;

        let api = {
          access: {
            deny: (reason: string) => {
              result.denied = reason;
              return api;
            },
          },
          idToken: {
            setCustomClaim: (name: string, value: unknown) => {
              setClaim(result.idTokenClaims, name, value);
              return api;
            },
          },
          accessToken: {
            setCustomClaim: (name: string, value: unknown) => {
              setClaim(result.accessTokenClaims, name, value);
              return api;
            },
          },
          user: {
            setUserMetadata: (name: string, value: unknown) => {
              result.userMetadata = { ...result.userMetadata, [name]: value };
              user.user_metadata = mergeMetadata(user.user_metadata, { [name]: value });
              return api;
            },
            setAppMetadata: (name: string, value: unknown) => {
              result.appMetadata = { ...result.appMetadata, [name]: value };
              user.app_metadata = mergeMetadata(user.app_metadata, { [name]: value });
              return api;
            },
          },
          cache: action.cache,
        };

        try {
          await action.onExecutePostLogin({ ...input, user, secrets: action.secrets }, api);
        } catch (error) {
          result.error = error;
        }

        // a failed or denied login runs no further actions, but keeps the metadata changes made so far
        if (result.error !== undefined || result.denied !== undefined) break;
      }

      return result;
    },
  };
}
