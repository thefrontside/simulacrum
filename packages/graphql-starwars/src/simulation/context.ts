import { Store } from '@simulacrum/server';

import { records } from './scenarios';
import { Context } from "../schema/types";

export const createSimulationContext = (store: Store): Context => {
  let characters = records(store).slice('characters');

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
