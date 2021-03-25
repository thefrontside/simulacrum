// @ts-ignore
import Faker from 'faker/lib';
// @ts-ignore
import locales from 'faker/lib/locales';

export function createFaker(seed: number): any {
  let faker = new Faker({ locales });
  faker.seed(seed);
  return faker;
}


export function stableIds(seed: number): () => string {
  let faker = createFaker(seed);
  return () => faker.datatype.uuid();
}
