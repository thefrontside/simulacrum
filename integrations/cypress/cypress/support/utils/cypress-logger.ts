export const makeCypressLogger = (label: string, displayName: string = label) => (message: string) => {
  Cypress.log({
    name: label,
    displayName,
    message
  });
};

export function cyLog(message: string, object: any | undefined = undefined) {
  cy.log(message, JSON.stringify(object, null, 4));
}
