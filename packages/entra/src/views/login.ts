import { encode } from "html-entities";
import type { AuthorizeQuery } from "../types.ts";

interface LoginViewProps {
  // where the form posts back to (the simulator's login handler)
  actionUrl: string;
  query: AuthorizeQuery;
  loginFailed: boolean;
}

const hidden = (name: string, value: string | undefined): string =>
  typeof value === "undefined"
    ? ""
    : `<input type="hidden" name="${name}" value="${encode(value)}" />`;

export const loginView = ({ actionUrl, query, loginFailed }: LoginViewProps): string => {
  return /*html*/ `
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sign in</title>
        <style>
          body { font-family: "Segoe UI", system-ui, sans-serif; background: #f2f2f2; margin: 0; }
          main { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.2); padding: 44px; width: 340px; }
          h1 { font-size: 24px; font-weight: 600; margin: 0 0 16px; }
          .sub { color: #1b1b1b; margin: 0 0 24px; }
          input[type=email], input[type=password] {
            width: 100%; box-sizing: border-box; border: none; border-bottom: 1px solid #666;
            padding: 6px 0; margin-bottom: 16px; font-size: 15px; outline: none;
          }
          button {
            background: #0067b8; color: #fff; border: none; padding: 8px 24px; float: right;
            font-size: 15px; cursor: pointer;
          }
          .error { color: #e81123; margin-bottom: 12px; ${loginFailed ? "" : "display:none;"} }
          .brand { color: #737373; font-size: 15px; margin-bottom: 16px; font-weight: 600; }
        </style>
      </head>
      <body>
        <main>
          <form class="card" method="post" action="${encode(actionUrl)}">
            <div class="brand">Microsoft Entra (Simulacrum)</div>
            <h1>Sign in</h1>
            <p class="sub">to continue to your application</p>
            <div class="error">Your account or password is incorrect.</div>
            <input
              id="username"
              name="username"
              type="email"
              autocomplete="username"
              placeholder="Email address"
              required
              value="${encode(query.login_hint ?? "")}"
            />
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="Password"
              required
            />
            ${hidden("client_id", query.client_id)}
            ${hidden("redirect_uri", query.redirect_uri)}
            ${hidden("response_type", query.response_type)}
            ${hidden("response_mode", query.response_mode)}
            ${hidden("scope", query.scope)}
            ${hidden("state", query.state)}
            ${hidden("nonce", query.nonce)}
            ${hidden("code_challenge", query.code_challenge)}
            ${hidden("code_challenge_method", query.code_challenge_method)}
            <button type="submit">Sign in</button>
          </form>
        </main>
      </body>
    </html>
  `;
};
