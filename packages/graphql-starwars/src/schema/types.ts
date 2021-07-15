export enum Episode {
  NEW_HOPE = "4",
  EMPIRE = "5",
  JEDI = "6",
}

export interface Human {
  __typename: 'Human';
  id: string;
  name: string;
  friends: ReadonlyArray<string>;
  appearsIn: Episode[];
  homePlanet?: string;
}

export interface Droid {
  __typename: 'Droid';
  id: string;
  name: string;
  friends: ReadonlyArray<string>;
  appearsIn: Episode[];
  primaryFunction: string;
}

export type Character = Human | Droid;

export interface StarWarsStore {
  getCharacters(): Promise<Array<Character>>;
  getCharacter(id: string): Promise<Character | undefined>;
  getFriends(character: Character): Promise<Array<Character>>;
  getHuman(id: string): Promise<Human | undefined>;
  getDroid(id: string): Promise<Droid | undefined>;
}

export interface Context {
  store: StarWarsStore;
}
