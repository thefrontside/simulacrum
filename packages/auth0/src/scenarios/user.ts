import { Slice } from '@effection/atom';
import { Faker, OptionalParams, Store } from '@simulacrum/server';
import { Operation } from 'effection';
import { v4 } from 'uuid';

type Predicate<T> = (this: void, value: T, index: number, obj: T[]) => boolean;

export interface Nonce {
  nonce: string;
  username: string;
}

export interface User {
  id: string;
  email?: string;
  password?: string;
  __personId?: string;
}

export interface Auth0State {
  nonce: Record<string, Nonce>;
  users: Record<string, User>;
}

export function *user(store: Store, faker: Faker, params: OptionalParams<User> = {}): Operation<User> {
  let id = v4();
  let slice = records(store).slice('users').slice(id);

  let attrs = {
    id,
    email: params.email ?? faker.internet.email().toLowerCase(),
    password: params.password ?? faker.internet.password(),
    __personId: params.__personId,
  };

  slice.set(attrs);
  return attrs;
}

export const userQuery = (store: Store) => (predicate: Predicate<User>): User | undefined => {
  let users = records(store).slice('users').get() ?? {};
  return Object.values(users).find(predicate);
};

export function records(store: Store): Slice<Auth0State> {
  let auth0 = store.slice("auth0");
  if (!auth0.get()) {
    auth0.set({});
  }

  let nonce = auth0.slice('nonce');
  if (!nonce.get()) {
    nonce.set({});
  }

  let users = auth0.slice("users");
  if (!users.get()) {
    users.set({});
  }

  return auth0 as unknown as Slice<Auth0State>;
}
