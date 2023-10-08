import { defineConfig } from 'cypress';
import { encrypt } from "./cypress/support/utils";
import { config } from 'dotenv';

export default defineConfig({
    video: false,
    screenshotOnRunFailure: false,
    defaultCommandTimeout: 10000,
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    chromeWebSecurity: false,
    e2e: {
        setupNodeEvents(on, config) {
            // Based on "CYPRESS_TEST_MODE" that is run, we need to load the correct environment variables.
            switch (process.env.CYPRESS_TEST_MODE) {
                case 'auth0-vue':
                    config.env = mergeEnvConfig(config.env, 'auth0-vue');
                    break;
                case 'nextjs-auth0':
                    config.env = mergeEnvConfig(config.env, 'nextjs-auth0');
                    break;
                case 'auth0-react':
                    config.env = mergeEnvConfig(config.env, 'auth0-react');
                    break;
                case 'create-react-app':
                    config.env = mergeEnvConfig(config.env, 'create-react-app');
                    break;
            }

            console.log('The environment variables used:', config.env);
            on('task', { encrypt });

            // Make sure the config is returned, otherwise it will not be used.
            return config;
        },
        // This is the url on which the application in test is running
        baseUrl: 'http://localhost:3000',
    },
    env: {
        // This is the SDK used to communicate with Auth0, can be either 'auth0-js', 'auth0-vue', 'auth0-react' or 'nextjs-auth0'
        AUTH0_SDK: 'auth0-js',
        // This is the port of the @simulacrum/auth0-simulator GraphQL server
        AUTH0_SIMULATOR_PORT: 4000,
        // This is the port of the simulated Auth0 server to which the Auth0 SDK will connect
        AUTH0_RUNNING_PORT: 4400,
        // The intended consumer of the token
        AUTH0_AUDIENCE: 'https://thefrontside.auth0.com/api/v1/',
        // The Client ID of the Auth0 application
        AUTH0_CLIENT_ID: "00000000000000000000000000000000",
        // The type of authentication flow used by the Auth0 SDK
        AUTH0_CONNECTION: "Username-Password-Authentication",
        // The default scope for the Auth0 user
        AUTH0_SCOPE: "openid profile email offline_access",
        // This is the secret used to sign the JWT tokens
        AUTH0_CLIENT_SECRET: 'fdmGkzmcHOwgUfMcP33y43yrKvSNjZzm',
        // This is the secret used to encrypt the session cookie
        AUTH0_COOKIE_SECRET: "",
        // This is the name of the session cookie used by the Cypress tests
        AUTH0_SESSION_COOKIE_NAME: "appSession",
    }
});

function mergeEnvConfig(configEnv: Record<string, any>, testMode: string): Record<string, string> {
    return {
        ...configEnv,
        ...config({ path: `.env.${testMode}` }).parsed
    };
}
