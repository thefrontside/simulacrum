import jsesc from "jsesc";
import type { QueryParams } from '../types';

export const webMessage = ({
  state,
  code,
  redirect_uri,
  nonce,
}: Pick<
  QueryParams,
  "state" | "code" | "redirect_uri" | "nonce"
>): string => {
  let data = jsesc(
    {
      redirect_uri,
    },
    { json: true, isScriptContext: true }
  );

  return `
  <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Authorization Response</title>
      </head>
      <body>
      <script ${nonce ? `nonce="${nonce}"` : ""} type="application/javascript">
        (function(window, document) {
          var data = ${data};
          var targetOrigin = data.redirect_uri;
          var webMessageRequest = {};
          
          var authorizationResponse = {
            type: "authorization_response",
            response: {
              "code":"${code}",
              "state":"${state}"}
            };
            
            var mainWin = (window.opener) ? window.opener : window.parent;
            
            if (webMessageRequest["web_message_uri"] && webMessageRequest["web_message_target"]) {
              window.addEventListener("message", function(evt) {
                if (evt.origin != targetOrigin) {
                  return;
                }
                
                switch (evt.data.type) {
                  case "relay_response":
                    var messageTargetWindow = evt.source.frames[webMessageRequest["web_message_target"]];
                    
                    if (messageTargetWindow) {
                      messageTargetWindow.postMessage(authorizationResponse, webMessageRequest["web_message_uri"]);
                      window.close();
                    }
                    break;
                  }
                }
              );
              
              mainWin.postMessage({
                type: "relay_request"
              }, targetOrigin);
            } else {
              mainWin.postMessage(authorizationResponse, targetOrigin);
            }
          })(this, this.document);
        </script>
      </body>
    </html>
  `;
};
