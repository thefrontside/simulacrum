import { assert } from "assert-ts";
import { decode, encode } from "base64-url";
import type { ScopeConfig } from "../types.ts";
import type { ExtendedSimulationStore } from "../store/index.ts";
import type { Auth0User } from "../store/entities.ts";

type Predicate<T> = (this: void, value: T, index: number, obj: T[]) => boolean;

export const createPersonQuery =
  (store: ExtendedSimulationStore) => (predicate: Predicate<Auth0User>) => {
    const users = store.schema.users.selectTableAsList(store.store.getState());
    return users.find(predicate);
  };

export const deriveScope = ({
  scopeConfig,
  clientID,
  audience,
}: {
  scopeConfig: ScopeConfig;
  clientID: string;
  audience: string;
}) => {
  if (typeof scopeConfig === "string") return scopeConfig;
  let defaultScope = scopeConfig.find((application) => application.clientID === "default");

  assert(!!clientID, `500::Did not have a clientID to derive the scope`);

  let application = scopeConfig.find(
    (application) =>
      application.clientID === clientID &&
      (application.audience ? application.audience === audience : true),
  );

  if (!application) {
    let ignoreAudience = scopeConfig.find((application) => application.clientID === clientID);
    assert(
      ignoreAudience === undefined,
      `500::Found application matching clientID, ${ignoreAudience?.clientID}, but incorrect audience, configured: ${ignoreAudience?.audience} :: passed: ${audience}`,
    );
  }

  if (!application && defaultScope) {
    application = defaultScope;
  }

  assert(!!application, `500::Could not find application with clientID: ${clientID}`);

  assert(!!application.scope, `500::${application.clientID} is expected to have a scope`);

  return application.scope;
};

// an authorization code carries the login's nonce and username, as JSON so either may hold a ":"
export const encodeCode = (nonce: unknown, username: unknown): string =>
  encode(JSON.stringify({ nonce, username }));

export const decodeCode = (code: string): { nonce?: string; username?: string } => {
  try {
    let { nonce, username } = JSON.parse(decode(code));
    return {
      ...(typeof nonce === "string" && { nonce }),
      ...(typeof username === "string" && { username }),
    };
  } catch {
    return {};
  }
};
