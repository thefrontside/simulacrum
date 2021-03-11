import { objectType, mutationType } from 'nexus';

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
        resolve(_, __, ctx) {
          return ctx.createSimulation();
        }
      })
    }
  })
]