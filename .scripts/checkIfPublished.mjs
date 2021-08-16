import { main } from "effection";
import { fetch } from "@effection/fetch";

const pkgName = process.argv[2];
const tag = process.argv[3];

main(function* () {
  const pkg = yield packageExists(pkgName, tag);
  console.log(pkg);
});

function* packageExists(name, tag) {
  let request = yield fetch(`https://registry.npmjs.com/${name}`);
  let response = yield request.json();
  if (request.status === 404) {
    return "not published";
  } else if (request.status < 400) {
    return response["dist-tags"][tag];
  } else {
    throw new Error("request error");
  }
}
