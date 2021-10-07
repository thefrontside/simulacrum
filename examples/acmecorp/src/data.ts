import { createGraph, createVertex, Distribution, Vertex } from '@frontside/graphgen';
import { createFaker } from './faker';

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  title: string;
  co: string;
  c: string;
  st: string;
  l: string;
}

export function createData(): Vertex<UserData>[] {
  let graph = createGraph({
    types: {
      vertex: [{
        name: 'User',
        data: () => {
          return {
            description: 'fake user',
            sample(seed) {
              let faker = createFaker(seed);
              let firstName = faker.name.firstName();
              let lastName = faker.name.lastName();
              let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@acmecorp.com`;
              let displayName = `${firstName} ${lastName}`;

              let title = faker.name.jobTitle();
              let co = faker.address.country();
              let c = faker.address.countryCode(co);
              let st = faker.address.stateAbbr();
              let l = faker.address.city();
              return { firstName, lastName, email, displayName, title, co, c, st, l };
            }
          } as Distribution<UserData>;
        },
        relationships: []
      }]
    }
  });

  for (let i = 0; i < 1000; i++) {
    createVertex(graph, 'User');
  }

  return Object.values(graph.vertices) as Vertex<UserData>[];
}
