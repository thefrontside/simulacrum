import type { Slice } from '@effection/atom';
import type { AuthOptions } from 'auth0-js';
import type { Client, Simulation } from '@simulacrum/client';

export const enum Auth0SDK {
    Auth0JS = 'auth0_js',
    Auth0Vue = 'auth0_vue',
    Auth0React = 'auth0_react',
    Auth0NextJS = 'nextjs_auth0',
}

export type TestState = Record<string, {
    client: Client;
    simulation?: Simulation;
    person?: Person
}>;

export type CreateSimulation = AuthOptions & { debug?: boolean };

export interface Token {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    access_token: Record<string, any>;
    expires_in: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id_token: Record<string, any>;
}

export interface Person {
    email: string;
    password: string;
}

export type GetClientFromSpec = (spec: string) => Client;

export interface EncryptPayload {
    secret: string,
    audience: string,
    user: Person,
    idToken?: string,
    accessToken?: string,
    accessTokenScope: string,
    accessTokenExpiresAt: number
    createdAt: number,
}

export interface CommandMaker {
    atom: Slice<TestState>;
    getClientFromSpec: GetClientFromSpec;
}
