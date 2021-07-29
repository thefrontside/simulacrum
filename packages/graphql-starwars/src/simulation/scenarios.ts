import { Slice } from '@effection/atom';
import { Store, Faker, OptionalParams } from '@simulacrum/server';
import { Operation } from 'effection';

import { droidNames, droidFunctions, humanNames, planetNames } from './data';
import { Character as CharacterBase, Droid, Episode, Human } from '../schema/types';

export type ManyScenarioParams = {
  n?: number;
}

export type Character = CharacterBase & {
  __personId?: string;
}

export interface StarWarsState {
  characters: Record<string, Character>;
}

// atom doesn't quite work right in the sense that we can't make a
// deep slice and have it create parents on demand.
export function records(store: Store): Slice<StarWarsState> {
  // create and initialize the graphql slice
  let graphql = store.slice("graphql");
  if (!graphql.get()) {
    graphql.set({});
  }

  // create and initialize our records within the graphql slice
  let characters = graphql.slice('characters');
  if (!characters.get()) {
    characters.set({});
  }

  return graphql as unknown as Slice<StarWarsState>;
}

export function *droid(store: Store, faker: Faker, params: OptionalParams<Droid> = {}): Operation<void> {
  let characters = records(store).slice('characters');
  let id = faker.datatype.uuid();

  characters.slice(id).set({
    __typename: 'Droid',
    id,
    friends: [],
    name: params.name ?? faker.random.arrayElement(droidNames),
    appearsIn: params.appearsIn ?? faker.random.arrayElements(Object.values(Episode)),
    primaryFunction: params.primaryFunction ?? faker.random.arrayElement(droidFunctions),
  });

  yield makeFriends(id, store, faker);
}

export function *human(store: Store, faker: Faker, params: OptionalParams<Human> = {}): Operation<void> {
  let characters = records(store).slice('characters');
  let id = faker.datatype.uuid();

  characters.slice(id).set({
    __typename: 'Human',
    id,
    friends: [],
    name: params.name ?? faker.random.arrayElement(humanNames),
    appearsIn: params.appearsIn ?? faker.random.arrayElements(Object.values(Episode)),
    homePlanet: params.homePlanet ?? faker.random.arrayElement(planetNames),
  });

  yield makeFriends(id, store, faker);
}

export function *makeFriends(id: string, store: Store, faker: Faker): Operation<void> {
  let characters = records(store).slice('characters');
  let target = characters.slice(id);
  let newFriends = faker.random.arrayElements(
    Object.keys(characters.get()).filter(friendId => friendId !== id),
    faker.datatype.number({ min: 1, max: 5 })
  );

  target.set({
    ...target.get(),
    friends: newFriends,
  });

  newFriends
    .map(id => characters.slice(id))
    .forEach(newFriend => {
      newFriend.set({
        ...newFriend.get(),
        friends: [...newFriend.get().friends, id],
      });
    });
}

export function *droids(store: Store, faker: Faker, { n = 1 }: ManyScenarioParams): Operation<void> {
  for(let i = 0; i < n; i++) {
    yield droid(store, faker);
  }
}

export function *humans(store: Store, faker: Faker, { n = 1 }: ManyScenarioParams): Operation<void> {
  for(let i = 0; i < n; i++) {
    yield human(store, faker);
  }
}

export function *droidsAndHumans(store: Store, faker: Faker, { n = 1 }: ManyScenarioParams): Operation<void> {
  for(let i = 0; i < n; i++) {
    yield faker.datatype.boolean() ?
      droid(store, faker) :
      human(store, faker);
  }
}

export const scenarios = {
  droid,
  human,
  droids,
  humans,
  droidsAndHumans,
};
