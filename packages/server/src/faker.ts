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
import type faker from 'faker';
export type Faker = typeof faker;

export function createFaker(seed: number): Faker {
  let faker = new FakerInstance({ locales });
  faker.seed(seed);
  return faker;
}


export function stableIds(seed: number): () => string {
  let faker = createFaker(seed);
  return () => faker.datatype.uuid();
}
