import { Slice } from '@effection/atom';
import { Simulation } from '@simulacrum/client';
import { GetClientFromSpec, TestState } from '../types';
import { makeCypressLogger } from '../utils/cypress-logger';
import { SimulationId } from './constants';

export interface MakeLogoutOptions {
  atom: Slice<TestState>;
  getClientFromSpec: GetClientFromSpec;
}

const log = makeCypressLogger('simulacrum-logout');

export const makeLogout = ({ atom, getClientFromSpec }: MakeLogoutOptions) => () => {
  cy.request('/api/auth/logout');
  cy.reload();
};
