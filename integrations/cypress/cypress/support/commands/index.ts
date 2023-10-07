import type { CreateSimulation, Person } from '../types';
import type { Auth0Result } from 'auth0-js';
import { getConfig } from "../utils";
import { registerGeneralCommands } from "./general";
import { registerNextjsAuth0Commands } from "./nextjs_auth0";
import { registerAuth0ReactCommands } from "./auth0_react";

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
            task<T>(event: string, args?: any, options?: Partial<Loggable & Timeoutable>): Chainable<T>
        }
    }
}

function setupAuth0CypressCommands() {
    let config = getConfig();

    let provider = config.sdk;

    registerGeneralCommands();

    if (provider === 'nextjs_auth0') {
        registerNextjsAuth0Commands();
    }

    if (provider === 'auth0_react') {
        registerAuth0ReactCommands();
    }
}

setupAuth0CypressCommands();

export {};
