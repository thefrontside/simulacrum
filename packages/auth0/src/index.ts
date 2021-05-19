import { Simulator } from "@simulacrum/server";
import { Service } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';

const auth0Service: Service = {
  protocol: 'https',
  app: createHttpApp()
};

export const auth0: Simulator = () => ({
  services: { auth0: auth0Service },
  scenarios: {}
});
