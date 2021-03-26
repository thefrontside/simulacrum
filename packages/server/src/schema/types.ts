import { objectType, mutationType, scalarType, nonNull, list, stringArg, intArg } from 'nexus';

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
          simulators: nonNull(
            list(nonNull(stringArg())),
          ),
        },
        resolve(_, { simulators }, ctx) {
          return ctx.createSimulation(simulators);
        }
      });
      t.field('given', {
        type: 'JSON',
        args: {
          simulation: nonNull(stringArg()),
          a: nonNull(stringArg())
        },
        resolve: async (_, { simulation, a: scenarioName }, ctx) => {
          return ctx.given(simulation, scenarioName);
        }
      });
    }
  })
];
