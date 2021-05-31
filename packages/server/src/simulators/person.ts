import { Slice } from '@effection/atom';
import { Operation } from 'effection';
import { v4 } from 'uuid';
import { Faker } from '../faker';
import { Behaviors, Params, Store } from "../interfaces";

export default function(): Behaviors {
  return {
    services: {},
    scenarios: { person }
  };
}

export interface Person {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface PersonParams extends Params {
  name?: string;
  email?: string;
  password?: string;
}

export function person(store: Store, faker: Faker, params: PersonParams): Operation<Person> {
  return function*() {
    let id = v4();
    let slice = records(store).slice(id);

    // this is the lamest data generation ever :)
    let attrs = {
      id,
      name: params.name ?? faker.name.findName(),
      email: params.email ?? faker.internet.email(),
      password: params.password ?? faker.internet.password()
    };

    slice.set(attrs);
    return attrs;
  };
}

function records(store: Store): Slice<Record<string, Record<string, unknown>>> {
  let people = store.slice("people");

  // atom doesn't quite work right in the sense that we can't make a
  // deep slice and have it create parents on demand.
  if (!people.get()) {
    people.set({});
  }
  return people;
}
