import { Context, Droid, Episode, Human, StarWarsStore } from './types';

/**
 * This is an example of a real store to accompany the schema.
 * We can create a simulacrum store that matches the _shape_ of this one,
 * and place it in context to run the schema as a simulation
 */

const luke: Human = {
  __typename: 'Human',
  id: '1000',
  name: 'Luke Skywalker',
  friends: ['1002', '1003', '2000', '2001'],
  appearsIn: [Episode.NEW_HOPE, Episode.EMPIRE, Episode.JEDI],
  homePlanet: 'Tatooine',
};

const vader: Human = {
  __typename: 'Human',
  id: '1001',
  name: 'Darth Vader',
  friends: ['1004'],
  appearsIn: [Episode.NEW_HOPE, Episode.EMPIRE, Episode.JEDI],
  homePlanet: 'Tatooine',
};

const han: Human = {
  __typename: 'Human',
  id: '1002',
  name: 'Han Solo',
  friends: ['1000', '1003', '2001'],
  appearsIn: [Episode.NEW_HOPE, Episode.EMPIRE, Episode.JEDI],
};

const leia: Human = {
  __typename: 'Human',
  id: '1003',
  name: 'Leia Organa',
  friends: ['1000', '1002', '2000', '2001'],
  appearsIn: [Episode.NEW_HOPE, Episode.EMPIRE, Episode.JEDI],
  homePlanet: 'Alderaan',
};

const tarkin: Human = {
  __typename: 'Human',
  id: '1004',
  name: 'Wilhuff Tarkin',
  friends: ['1001'],
  appearsIn: [Episode.EMPIRE],
};

const humanData: { [id: string]: Human } = {
  [luke.id]: luke,
  [vader.id]: vader,
  [han.id]: han,
  [leia.id]: leia,
  [tarkin.id]: tarkin,
};

const threepio: Droid = {
  __typename: 'Droid',
  id: '2000',
  name: 'C-3PO',
  friends: ['1000', '1002', '1003', '2001'],
  appearsIn: [Episode.NEW_HOPE, Episode.EMPIRE, Episode.JEDI],
  primaryFunction: 'Protocol',
};

const artoo: Droid = {
  __typename: 'Droid',
  id: '2001',
  name: 'R2-D2',
  friends: ['1000', '1002', '1003'],
  appearsIn: [Episode.NEW_HOPE, Episode.EMPIRE, Episode.JEDI],
  primaryFunction: 'Astromech',
};

const droidData: { [id: string]: Droid } = {
  [threepio.id]: threepio,
  [artoo.id]: artoo,
};

export const store: StarWarsStore = {
  getCharacters() {
    return Promise.resolve([
      ...Object.values(humanData),
      ...Object.values(droidData)
    ]);
  },
  getCharacter(id) {
    return Promise.resolve(humanData[id] ?? droidData[id]);
  },
  async getFriends(character) {
    let friends = await Promise.all(character.friends.map((id) => this.getCharacter(id)));
    return friends.flatMap(x => x !== undefined ? [x] : []);
  },
  getHuman(id) {
    return Promise.resolve(humanData[id]);
  },
  getDroid(id) {
    return Promise.resolve(droidData[id]);
  },
};

export const createContext = (): Context => ({
  store,
});
