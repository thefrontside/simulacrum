# Simulacrum Server with Auth0 Interfaced With Nextjs

[![Edit remark-codesandbox demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/thefrontside/simulacrum/tree/v0/examples/nextjs_with_auth0-react)

This uses the [auth0/auth0-react](https://github.com/auth0/auth0-react) package. It is setup using those instructions with the `domain` pointing at our simulacrum service instead of the Auth0 API. This greatly improves the experience around testing locally, and then changing an environment variable to test in "staging" or moving to "production".

## Getting Started

First, run the simulacrum server with the auth0 service. Note this example and lockfile use `npm@7`. It will start up the service and create a user for you to use to login.

```bash
npm run sim
```

In a separate terminal window, also run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Click on the login link, and enter the information from the user created in your simulation. It is output in your console running the simulation.

Now you are logged in!
