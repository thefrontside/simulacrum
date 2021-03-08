import { describe, it } from 'mocha';
import expect from 'expect';

import { createServer } from '../src';

describe("@simulacrum/server", () => {
  it('exists', () => {
    expect(createServer).toBeInstanceOf(Function)
  });
})
