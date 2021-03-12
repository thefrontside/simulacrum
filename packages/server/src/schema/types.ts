import { objectType, mutationType, nonNull, list, stringArg } from 'nexus';

export const types = [
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
