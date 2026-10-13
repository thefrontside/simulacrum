import { encode } from "html-entities";

const page = (title: string, body: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${encode(title)}</title>
  </head>
  <body>
    <h1>${encode(title)}</h1>
    ${body}
  </body>
</html>`;

export const passwordResetForm = ({ ticket, email }: { ticket: string; email: string }) =>
  page(
    "Change your password",
    `<form method="post" action="/lo/reset">
      <p>Set a new password for ${encode(email)}.</p>
      <input type="hidden" name="ticket" value="${encode(ticket)}" />
      <label>New password <input type="password" name="password" required /></label>
      <button type="submit">Change password</button>
    </form>`,
  );

export const passwordResetMessage = (title: string, message: string) =>
  page(title, `<p>${encode(message)}</p>`);
