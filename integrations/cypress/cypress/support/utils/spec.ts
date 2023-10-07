import type { Slice } from '@effection/atom';
import type { Client } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import type { TestState } from '../types';

export interface MakeGetClientFromSpecOptions {
  atom: Slice<TestState>;
  port: number;
}


