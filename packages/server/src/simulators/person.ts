import { Slice } from '@effection/atom';
import { Operation } from 'effection';
import { v4 } from 'uuid';
import { Behaviors, Store } from "../interfaces";

export default function(): Behaviors {
  return {
    services: {},
    scenarios: { person }
  };
}

export interface Person {
  name: string;
}

export function person(store: Store): Operation<Person> {
  return function*() {
    let id = v4();
    let slice = records(store).slice(id);

    // this is the lamest data generation ever :)
    let attrs = { id, name: "Bob Dobalina" };

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
