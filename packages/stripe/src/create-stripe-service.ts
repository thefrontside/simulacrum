import { ResourceServiceCreator } from "@simulacrum/server/dist/interfaces";

export function createStripeService() : ResourceServiceCreator {
  return {
    *init() {
      return {
        port: '3500',
        protocol: 'https'
      };
    }
  };
}
