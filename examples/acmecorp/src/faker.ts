import { Graph, Edge, Seed, CreateData, Vertex } from '@frontside/graphgen';

import seedrandom from 'seedrandom';

/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-ignore
import FakerInstance from 'faker/lib';
// @ts-ignore
import locales from 'faker/lib/locales';

// the @types/faker don't account for
// constructing individual instances of faker so we
// import the default faker export and use that type
// as the type of all fakers. A nice side-quest would be
// to add types.d.ts directly to the faker project.
import { default as _faker } from 'faker';
export type Faker = typeof _faker;

export function createFaker(seed: () => number = seedrandom()): Faker {
  const faker = new FakerInstance({ locales });
  faker.seed(seed() * 100000);
  return faker;
}

export const faker = createFaker();


export interface DataFactory<T> {
  (seed: Seed, source: Vertex, graph: Graph, edge: Edge): T
}

export function withFaker<T>(description: string, factory: (faker: Faker) => DataFactory<T>):  CreateData<T> {
  return (source, graph, edge) => ({
    description,
    sample(seed) {
      let faker = createFaker(seed);
      return factory(faker)(seed, source, graph, edge);
    }
  })
}
