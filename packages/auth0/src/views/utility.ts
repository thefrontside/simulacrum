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
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      href="https://unpkg.com/tailwindcss@^2/dist/tailwind.css"
      rel="stylesheet"
    />
    <script src="https://cdn.auth0.com/js/auth0/9.16.0/auth0.js"></script>
  </0head>
  <body>
    <main class="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <section class="max-w-md w-full">
        <div class="flex justify-center">
          <img alt="frontside" class="bg-transparent object-contain h-16" src="/img/frontside-logo.png" />
        </div>
        <h1 class="flex justify-center text-4xl">Token Utilities</h1>
        <form id="the-form" class="mt-8" method="POST" action="/utility/verify">
          <div class="rounded-md shadow-sm">
            <div>
              <label for="token" class="sr-only">id_token</label>
              <input id="token" name="token" type="email" autocomplete="email" required="" value="" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="id_token">
            </div>
            <div class="my-2">
              <button id="submit" type="button" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Verify
              </button>
            </div>
          </div>
        </form>
        <div class="${Object.keys(result).length === 0 ? 'hidden' : ''}">
          <p class="text-sm uppercase text-blue-600">Verify</p>
          <code class="whitespace-pre">${JSON.stringify(result, null, 2)}</code>
        </div>
      </section>
    </main>
  </body>
</html>
`;
