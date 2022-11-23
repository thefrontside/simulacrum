import { assert } from 'assert-ts';
import type { Person } from '@simulacrum/server';
import type { ScopeConfig } from '../types';

type Predicate<T> = (this: void, value: T, index: number, obj: T[]) => boolean;

export const createPersonQuery =
  (people: Iterable<Person>) => (predicate: Predicate<Person>) => {
    return [...people].find(predicate);
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
  if (typeof scopeConfig === 'string') return scopeConfig;

  assert(!!clientID, `500::Did not have a clientID to derive the scope`);

  let application = scopeConfig.find(
    (application) =>
      application.clientID === clientID &&
      (application.audience ? application.audience === audience : true)
  );

  if (!application) {
    let ignoreAudience = scopeConfig.find(
      (application) => application.clientID === clientID
    );
    assert(
      ignoreAudience === undefined,
      `500::Found application matching clientID, ${ignoreAudience?.clientID}, but incorrect audience, configured: ${ignoreAudience?.audience} :: passed: ${audience}`
    );
  }

  assert(
    !!application,
    `500::Could not find application with clientID: ${clientID}`
  );

  assert(
    !!application.scope,
    `500::${application.clientID} is expected to have a scope`
  );

  return application.scope;
};
