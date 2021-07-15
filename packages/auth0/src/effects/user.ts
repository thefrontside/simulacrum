import { Slice } from '@effection/atom';
import { onPerson, SimulationState, Faker } from '@simulacrum/server';
import { Operation } from 'effection';

import { userQuery, user } from '../scenarios/user';

export function *createUserFromPerson(slice: Slice<SimulationState>, faker: Faker): Operation<void> {
  let store = slice.slice('store');

  yield onPerson(store, function *(person) {
    let { id, email, password } = person.get();
    let existingUser = userQuery(store)(user => user.__personId === id);
    if (!existingUser) {
      yield user(store, faker, { email, password, __personId: id });
    }
  });
}
