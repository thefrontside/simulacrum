import {
  GraphQLSchema, GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLObjectType } from 'graphql';

import { Context, Droid, Episode, Human } from './types';

/**
 * A simple schema for testing and documentation.
 *
 * Resolvers should be pure; that is they should only rely on what is in 'Context'.
 * This allows us to swap the real context for one that is backed by simulation.
 */

const episodeEnum = new GraphQLEnumType({
  name: 'Episode',
  description: 'One of the films in the Star Wars Trilogy',
  values: {
    NEW_HOPE: {
      value: Episode.NEW_HOPE,
      description: 'Released in 1977.',
    },
    EMPIRE: {
      value: Episode.EMPIRE,
      description: 'Released in 1980.',
    },
    JEDI: {
      value: Episode.JEDI,
      description: 'Released in 1983.',
    },
  },
});

const characterInterface: GraphQLInterfaceType = new GraphQLInterfaceType({
  name: 'Character',
  description: 'A character in the Star Wars Trilogy',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The id of the character.',
    },
    name: {
      type: GraphQLString,
      description: 'The name of the character.',
    },
    friends: {
      type: new GraphQLList(characterInterface),
      description:
        'The friends of the character, or an empty list if they have none.',
    },
    appearsIn: {
      type: new GraphQLList(episodeEnum),
      description: 'Which movies they appear in.',
    },
    secretBackstory: {
      type: GraphQLString,
      description: 'All secrets about their past.',
    },
  }),
});

const humanType = new GraphQLObjectType<Human, Context>({
  name: 'Human',
  description: 'A humanoid creature in the Star Wars universe.',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The id of the human.',
    },
    name: {
      type: GraphQLString,
      description: 'The name of the human.',
    },
    friends: {
      type: new GraphQLList(characterInterface),
      description:
        'The friends of the human, or an empty list if they have none.',
      resolve: (human, _args, { store }) => store.getFriends(human),
    },
    appearsIn: {
      type: new GraphQLList(episodeEnum),
      description: 'Which movies they appear in.',
    },
    homePlanet: {
      type: GraphQLString,
      description: 'The home planet of the human, or null if unknown.',
    },
    secretBackstory: {
      type: GraphQLString,
      description: 'Where are they from and how they came to be who they are.',
      resolve() {
        throw new Error('secretBackstory is secret.');
      },
    },
  }),
  interfaces: [characterInterface],
});

const droidType = new GraphQLObjectType<Droid, Context>({
  name: 'Droid',
  description: 'A mechanical creature in the Star Wars universe.',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The id of the droid.',
    },
    name: {
      type: GraphQLString,
      description: 'The name of the droid.',
    },
    friends: {
      type: new GraphQLList(characterInterface),
      description:
        'The friends of the droid, or an empty list if they have none.',
      resolve: (droid, _args, { store }) => store.getFriends(droid),
    },
    appearsIn: {
      type: new GraphQLList(episodeEnum),
      description: 'Which movies they appear in.',
    },
    secretBackstory: {
      type: GraphQLString,
      description: 'Construction date and the name of the designer.',
      resolve() {
        throw new Error('secretBackstory is secret.');
      },
    },
    primaryFunction: {
      type: GraphQLString,
      description: 'The primary function of the droid.',
    },
  }),
  interfaces: [characterInterface],
});

const queryType = new GraphQLObjectType<undefined, Context>({
  name: 'Query',
  fields: () => ({
    human: {
      type: humanType,
      args: {
        id: {
          description: 'id of the human',
          type: new GraphQLNonNull(GraphQLString),
        },
      },
      resolve: (_source, { id }, { store }) => store.getHuman(id),
    },
    droid: {
      type: droidType,
      args: {
        id: {
          description: 'id of the droid',
          type: new GraphQLNonNull(GraphQLString),
        },
      },
      resolve: (_source, { id }, { store }) => store.getDroid(id),
    },
    characters: {
      type: new GraphQLList(characterInterface),
      resolve: (_source, _args, { store }) => store.getCharacters(),
    }
  }),
});

export const schema: GraphQLSchema = new GraphQLSchema({
  query: queryType,
  types: [humanType, droidType],
});
