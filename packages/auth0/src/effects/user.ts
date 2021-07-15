import { onPerson, Faker, Store } from '@simulacrum/server';
import { Operation } from 'effection';

import { userQuery, user } from '../scenarios/user';

export function *createUserFromPerson(store: Store, faker: Faker): Operation<void> {
  yield onPerson(store, function *(person) {
    let { id, email, password } = person.get();
    let existingUser = userQuery(store)(user => user.__personId === id);
    if (!existingUser) {
      yield user(store, faker, { email, password, __personId: id });
    }
  });
}
