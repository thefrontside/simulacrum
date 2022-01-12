export const makeCypressLogger = (label: string, displayName: string = label) => (message: string) => {
  Cypress.log({
    name: label,
    displayName,
    message
  });
};
