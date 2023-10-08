import type { CreateSimulation, Person } from '../types';
import { Auth0SDK } from "../types";
import type { Auth0Result } from 'auth0-js';
import { getConfig } from "../utils";
import { registerGeneralCommands } from "./general";
import { registerAuth0JsCommands } from "./auth0-js";
import { registerAuth0ReactCommands } from "./auth0-react";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable<Subject> {
            createSimulation(options?: CreateSimulation): Chainable<Subject>;

            destroySimulation(): Chainable<Subject>;

            login(person?: Partial<Person>): Chainable<string>;

            logout(): Chainable<AUTWindow>;

            given(attrs?: Partial<Person>): Chainable<Person>;

            out<S = unknown>(msg: string): Chainable<S>;

            getUserInfo(accessToken: string): Chainable<Person>;

            getUserTokens(person: Person): Chainable<Auth0Result & { scope: string }>;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            task<T>(event: string, args?: any, options?: Partial<Loggable & Timeoutable>): Chainable<T>;
        }
    }
}

function setupAuth0CypressCommands() {
    let config = getConfig();

    let provider = config.sdk;

    registerGeneralCommands();

    switch (provider) {
        case Auth0SDK.Auth0JS:
            registerAuth0JsCommands();
            break;
        case Auth0SDK.Auth0Vue:
            registerAuth0ReactCommands();
            break;
        case Auth0SDK.Auth0React:
            registerAuth0ReactCommands();
            break;
        case Auth0SDK.Auth0NextJS:
            registerAuth0JsCommands();
            break;
        default:
            throw new Error(`Unknown Auth0 SDK: ${provider}`);
    }
}

setupAuth0CypressCommands();

export {};
