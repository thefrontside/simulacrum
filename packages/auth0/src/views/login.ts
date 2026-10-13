import type { ScopeConfig } from "../types.ts";
import { deriveScope } from "../handlers/utils.ts";

interface LoginViewProps {
  domain: string;
  scope: ScopeConfig;
  redirectUri: string;
  clientID: string;
  audience: string;
  loginFailed: boolean;
  signup?: boolean;
  loginHint?: string | undefined;
  switchModeUrl?: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const loginView = ({
  domain,
  scope: scopeConfig,
  redirectUri,
  clientID,
  audience,
  loginFailed = false,
  signup = false,
  loginHint = "",
  switchModeUrl,
}: LoginViewProps): string => {
  return /*html*/ `
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css"
          rel="stylesheet"
        />
        <script src="https://cdn.auth0.com/js/auth0/9.19.0/auth0.js"></script>
      </head>
      <title>${signup ? "signup" : "login"}</title>
      <body>
        <main
          class="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8"
        >
          <div class="max-w-md w-full space-y-8">
            <div class="flex justify-center">
              <img
                alt="frontside"
                class="bg-transparent object-contain h-16"
                src="/img/frontside-logo.png"
              />
            </div>
            <h1 class="flex justify-center text-4xl">${signup ? "Create your account" : "Welcome"}</h1>
            <h2 class="flex justify-center">${signup ? "Sign up" : "Login"} to continue to frontside</h2>
            <form id="the-form" class="mt-8 space-y-6">
              <div class="rounded-md shadow-sm -space-y-px">
                <div>
                  <label for="username" class="sr-only">Email address</label>
                  <input
                    id="username"
                    name="username"
                    type="email"
                    autocomplete="email"
                    required=""
                    value="${escapeHtml(loginHint)}"
                    class="${
                      loginFailed ? "border-red-500" : ""
                    } appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label for="password" class="sr-only">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="${signup ? "new-password" : "current-password"}"
                    required=""
                    class="my-4 ${
                      loginFailed ? "border-red-500" : ""
                    } appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div
                class="error bg-red-500 text-white p-3 ${loginFailed ? "" : "hidden"}"
              >
                ${signup ? "Could not sign up" : "Wrong email or password"}
              </div>

              <div>
                <button
                  id="submit"
                  type="submit"
                  class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span
                    class="absolute left-0 inset-y-0 flex items-center pl-3"
                  >
                    <svg
                      class="h-5 w-5 text-blue-500 group-hover:text-blue-400"
                      x-description="Heroicon name: solid/lock-closed"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </span>
                  ${signup ? "Sign up" : "Sign in"}
                </button>
              </div>${
                switchModeUrl
                  ? /*html*/ `
              <p class="text-center text-sm">
                ${signup ? "Already have an account?" : "Don't have an account?"}
                <a id="switch-mode" class="text-blue-600" href="${escapeHtml(switchModeUrl)}"
                  >${signup ? "Log in" : "Sign up"}</a
                >
              </p>`
                  : ""
              }
            </form>
          </div>
        </main>
        <script>
          document.addEventListener("DOMContentLoaded", function () {
            var webAuth = new window.auth0.default.WebAuth({
              domain: "${domain}",
              clientID: "${clientID}",
              redirectUri: "${redirectUri}",
              audience: "${audience}",
              responseType: "token id_token",
            });
            var form = document.querySelector("#the-form");

            form.addEventListener("submit", function (e) {
              event.preventDefault();
              event.stopPropagation();
              let params = new URLSearchParams(window.location.search);

              var username = document.querySelector("#username");
              var password = document.querySelector("#password");

              var showError = function () {
                [username, password].forEach((e) => e.classList.add("border-red-500"));
                document.querySelector(".error").classList.remove("hidden");
              };
              var login = function () {
                webAuth.login(
                  {
                    username: username.value,
                    password: password.value,
                    realm: "Username-Password-Authentication",
                    scope: "${deriveScope({ scopeConfig, clientID, audience })}",
                    nonce: params.get("nonce"),
                    state: params.get("state"),
                  },
                  function (err) {
                    if (err) showError();
                  }
                );
              };

              ${
                signup
                  ? /*js*/ `webAuth.signup(
                {
                  email: username.value,
                  password: password.value,
                  connection: "Username-Password-Authentication",
                },
                function (err) {
                  if (err) showError();
                  else login();
                }
              );`
                  : "login();"
              }
            });
          });
        </script>
      </body>
    </html>
  `;
};
