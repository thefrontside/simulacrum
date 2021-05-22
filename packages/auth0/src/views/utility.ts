const html = String.raw;

interface Props {
  url: string;
  id_token?: string;
  nonce?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: Record<string, any>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const renderToken = ({ url, nonce = '', id_token = '', result = {} }: Props): string => html`
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <script src="https://cdn.auth0.com/js/auth0/9.16.0/auth0.js"></script>
  </head>
  <body>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <h1>Login</h1>
        <form id="the-form" class="mt-8 space-y-6" method="POST" action="/utility/verify">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="token" class="sr-only">id token</label>
              <input id="id_token" name="id_token" required="" value="${id_token}" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="id_token">
            </div>
            <div>
              <label for="token" class="sr-only">nonce</label>
              <input id="nonce" name="nonce" required="" value="${nonce}" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="nonce">
            </div>
            <div>
            <button id="submit" type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              Verify
            </button>
          </div>
        </form>
        <div>
        <p class="text-sm uppercase text-blue-600">JWT Payload</p>
        <code class="whitespace-pre">${JSON.stringify(result, null, 2)}</code>
      </div>
      </div>
    </div>
  </body>
</html>
`;
