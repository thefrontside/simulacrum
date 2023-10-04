import type { CommandMaker } from '../../types';
import { assert } from 'assert-ts';
import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-login-pkce');

export const makeLogin = ({ atom }: Pick<CommandMaker, 'atom'>) => () => {
};
