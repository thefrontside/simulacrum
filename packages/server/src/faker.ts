// @ts-ignore
import Faker from 'faker/lib';

export function createFaker(seed: number): any {
  let faker = new Faker({ locales: require('faker/lib/locales') });
  faker.seed(seed);
  return faker;
}


export function stableIds(seed: number): () => string {
  let faker = createFaker(seed);
  return () => faker.datatype.uuid();
}
