import { objectType, mutationType, scalarType, nonNull, stringArg, intArg, subscriptionType } from 'nexus';

import { createSimulation, destroySimulation, given, state } from './operations';

export const types = [
  scalarType({
    name: "JSON",
    description: "JSON value",
    serialize: value => value
  }),
  objectType({
    name: 'Service',
    definition(t) {
      t.nonNull.string('name');
      t.nonNull.string('url');
    }
  }),
  objectType({
    name: 'Simulation',
    definition(t) {
      t.id('id');
      t.nonNull.list.field('services', {
        type: 'Service'
      });
    }
  }),
  mutationType({
    definition(t) {
      t.field('createSimulation', {
        type: 'Simulation',
        args: {
          seed: intArg(),
          simulator: stringArg(),
        },
        ...createSimulation
      });
      t.field('destroySimulation', {
        type: 'Boolean',
        args: {
          id: nonNull(stringArg())
        },
        ...destroySimulation
      });
      t.field('given', {
        type: 'JSON',
        args: {
          simulation: nonNull(stringArg()),
          a: nonNull(stringArg())
        },
        ...given
      });
    }
  }),
  subscriptionType({
    definition(t) {
      t.field('state', {
        type: 'JSON',
        ...state
      });
    }
  })
];
