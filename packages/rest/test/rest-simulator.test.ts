import { describe, it } from '@effection/mocha';
import expect from 'expect';
import { createRestSimulator } from '../src/rest-simulator/rest-simulator';

describe('restSimulator', () => {
  it('should be defined', function*() {
    expect(createRestSimulator).toBeDefined();
  });
});
