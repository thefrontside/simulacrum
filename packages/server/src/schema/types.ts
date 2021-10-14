import { objectType, mutationType, scalarType, nonNull, arg, stringArg, intArg, subscriptionType, booleanArg } from 'nexus';

import { createSimulation, destroySimulation, given, state } from './operations';

export const types = [
  scalarType({
    name: "JSON",
    description: "JSON value",
    serialize: value => value,
    parseValue: value => value
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
      t.nonNull.string('status');
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
          simulator: nonNull(stringArg()),
          options: arg({
            type: 'JSON',
            description: "options to pass to the simulation"
          }),
          debug: booleanArg(),
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
          a: nonNull(stringArg()),
          params: arg({
            type: 'JSON',
            description: "parameters for this scenario",
            default: {}
          })
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
