import {
  createProxyMiddleware,
  responseInterceptor,
  type Options as ProxyOptions,
} from "http-proxy-middleware";
import fsPromise from "node:fs/promises";
import path from "node:path";

export function apiProxy(proxyAndSave: string) {
  const options: ProxyOptions = {
    logger: console,
    // secure: false,
    changeOrigin: true, // needed for virtual hosted sites
    ws: true,
    target: process.env.SIM_PROXY ?? proxyAndSave,
    /**
     * IMPORTANT: avoid res.end being called automatically
     **/
    selfHandleResponse: true, // res.end() will be called internally by responseInterceptor()
    on: {
      proxyRes: responseInterceptor(
        async (responseBuffer, proxyRes, req, res) => {
          const filename = `./src/serve${req.url ?? "log"}.json`;

          // check response can parse as json
          let jsonResponse;
          try {
            jsonResponse = JSON.parse(responseBuffer.toString("utf8"));
          } catch (error) {
            console.error(`failed to parse return as JSON from ${req.url}`);
            return responseBuffer;
          }

          // create folder for said response
          try {
            await fsPromise.mkdir(path.dirname(filename), {
              recursive: true,
            });
          } catch (error) {
            console.error(
              `unable to create folders: ${path.dirname(filename)}`
            );
            return responseBuffer;
          }

          try {
            await fsPromise.writeFile(
              filename,
              JSON.stringify(jsonResponse, null, 2)
            );
          } catch (error) {
            console.error(error);
          }
          return responseBuffer;
        }
      ),
    },
  };
  return createProxyMiddleware(options);
}
