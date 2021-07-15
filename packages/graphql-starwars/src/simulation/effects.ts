
import { Slice } from '@effection/atom';
import { onPerson, SimulationState, Faker } from '@simulacrum/server';
import { Operation } from 'effection';

import { human, records } from './scenarios';

export function *createHumanFromPerson(slice: Slice<SimulationState>, faker: Faker): Operation<void> {
  let store = slice.slice('store');

  yield onPerson(store, function *(person) {
    let { id, name } = person.get();
    let characters = records(store).slice('characters').get();
    let existingHuman = Object.values(characters).find(({ __personId }) => __personId === id);
    if (!existingHuman) {
      yield human(store, faker, { name });
    }
  });
}

export const effects = {
  createHumanFromPerson
};
