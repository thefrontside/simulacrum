import { describe, it } from '@effection/mocha';
import expect from 'expect';
import { restSimulator } from '../src/rest-simulator/rest-simulator';

describe('restSimulator', () => {
  it('should be defined', function*() {
    expect(restSimulator).toBeDefined();
  });
});
