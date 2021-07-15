import { Slice } from '@effection/atom';
import { Operation } from 'effection';
import { v4 } from 'uuid';

import { map, Effect } from '../effect';
import { Faker } from '../faker';
import { Behaviors, Store } from "../interfaces";

export default function(): Behaviors {
  return {
    services: {},
    scenarios: { person }
  };
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  password?: string;
  picture?: string;
}

export type OptionalParams<T extends { id: string }> = Partial<Omit<T, 'id'>>;

export function person(store: Store, faker: Faker, params: OptionalParams<Person> = {}): Operation<Person> {
  return function*() {
    let id = v4();
    let slice = records(store).slice(id);

    let name = params.name ?? faker.name.findName();

    // this is the lamest data generation ever :)
    let attrs = {
      id,
      name,
      email: params.email ?? faker.internet.email(name).toLowerCase(),
      password: params.password ?? faker.internet.password()
    };

    slice.set(attrs);
    return attrs;
  };
}

export function *onPerson(store: Store, effect: Effect<Person>): Operation<void> {
  yield map<Person>(records(store) as Slice<Record<string, Person>>, effect);
}

function records(store: Store): Slice<Record<string, Person>> {
  let people = store.slice("people");

  // atom doesn't quite work right in the sense that we can't make a
  // deep slice and have it create parents on demand.
  if (!people.get()) {
    people.set({});
  }
  return people as unknown as Slice<Record<string, Person>>;
}
