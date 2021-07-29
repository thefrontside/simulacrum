import { onPerson, Faker, Store } from '@simulacrum/server';
import { Operation } from 'effection';

import { userQuery, user } from '../scenarios/user';

export function *createUserFromPerson(store: Store, faker: Faker): Operation<void> {
  yield onPerson(store, function *(person) {
    let { email, password } = person.get();
    let existingUser = userQuery(store)(user => user.email === email);
    if (!existingUser) {
      yield user(store, faker, { email, password });
    }
  });
}
