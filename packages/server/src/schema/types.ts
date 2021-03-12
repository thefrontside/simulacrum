import { objectType, mutationType, nonNull, list, stringArg } from 'nexus';

export const types = [
  objectType({
    name: 'Simulation',
    definition(t) {
      t.id('id');
    }
  }),
  mutationType({
    definition(t) {
      t.nonNull.field('createSimulation', {
        type: 'Simulation',
        args: {
          simulators: nonNull(
            list(nonNull(stringArg())),
          ),
        },
        resolve(_, { simulators }, ctx) {
          return ctx.createSimulation(simulators);
        }
      })
    }
  })
]