import { Slice } from '@effection/atom';
import { Store } from '@simulacrum/server';

import { Character, Context } from "../schema/types";
import { ContextCreator } from "../../../types";

// atom doesn't quite work right in the sense that we can't make a
// deep slice and have it create parents on demand.
export function records<TRecord = unknown>(store: Store, key: string): Slice<Record<string, TRecord>> {
  // create and initialize the graphql slice
  let graphql = store.slice("graphql");
  if (!graphql.get()) {
    graphql.set({});
  }

  // create and initialize our records within the graphql slice
  let slice = graphql.slice(key);
  if (!slice.get()) {
    slice.set({});
  }
  return slice;
}


export const context: ContextCreator<Context> = (store) => {
  let characters = records<Character>(store, 'characters');

  return {
    store: {
      async getCharacter(id) {
        return characters.slice(id).get();
      },
      async getDroid(id) {
        let character = await this.getCharacter(id);
        return character?.__typename === 'Droid' ? character : undefined;
      },
      async getHuman(id) {
        let character = await this.getCharacter(id);
        return character?.__typename === 'Human' ? character : undefined;
      },
      async getFriends(character) {
        let result = await Promise.all(character.friends.map(id => this.getCharacter(id)));
        return result.flatMap(x => x !== undefined ? [x] : []);
      },
      async getCharacters() {
        return Object.values(characters.get());
      }
    }
  };
};
