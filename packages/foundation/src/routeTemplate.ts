import type { SimulationRoute } from "./store/schema";

const responseSubmit = (routeId: string, response: number) => /* HTML */ `<form
  action=""
  method="post"
>
  <input type="submit" name="${routeId}" value="${response}" />
</form>`;
const routeToId = (route: SimulationRoute) => `${route.method}:${route.url}`;

export const generateRoutesHTML = (routes: SimulationRoute[]) => {
  return /* HTML */ `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Simulation Server Routes</title>
        <style>
          html {
            font-size: 16px;
            line-height: 1.5;
            background-color: #fff;
            color: #000;
          }
          body {
            margin: 0 auto;
            max-width: 720px;
            padding: 0 16px;
            font-family: sans-serif;
          }

          a {
            text-decoration: none;
          }

          .routes {
            display: grid;
            grid-template-columns: 1fr 5fr 1fr 1fr 2fr;
            column-gap: 15px;
          }
          .route-actions {
            display: flex;
            gap: 5px;
          }

          li {
            margin-bottom: 8px;
          }

          /* Dark mode styles */
          @media (prefers-color-scheme: dark) {
            html {
              background-color: #1e293b;
              color: #fff;
            }

            a {
              color: aqua;
            }
          }
        </style>
      </head>
      <body>
        <main class="my-12">
          <h1>Simulation Routes</h1>
          <div class="routes">
            <span>Method</span>
            <span>URL</span>
            <span>Status</span>
            <span>Metrics</span>
            <span>Response Options</span>
            ${routes
              .map(
                (route) =>
                  `<span>${route.method.toUpperCase()}</span><a href=${
                    route.url
                  }>${route.url}</a><span>code ${
                    route.defaultCode
                  }</span><span>${
                    route.calls
                  } calls</span><div class="route-actions">${route.responses
                    .map((response) =>
                      responseSubmit(routeToId(route), response)
                    )
                    .join("")}</div>`
              )
              .join("\n")}
          </div>
        </main>
      </body>
    </html>`;
};
