import { Button } from '@interactors/with-cypress';
import config from '../../cypress.env.json';

describe('log in', () => {
  beforeEach(() => {
    cy.logout();
  });

  it('should get token without signing in', () => {
    cy.createSimulation(config)
      .visit('/')
      .given({ email: 'fourth@gmail.com', password: 'passw0rd' })
      .login()
      .visit('/')
      .contains('Log out');
  });
});
