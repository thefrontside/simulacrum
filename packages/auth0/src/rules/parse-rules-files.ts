import { extensionlessFileName } from './extensionless-file-name';
import { assert } from 'assert-ts';
import fs from "fs";
import path from "path";


export function parseRulesFiles(rulesPath: string): {code: string, filename: string}[] {
  let ruleFiles = fs
  .readdirSync(rulesPath)
  .filter((f) => path.extname(f) === ".js");

  return ruleFiles
    .map((r) => {
      let filename = path.join(rulesPath, r);

      let jsonFile = `${extensionlessFileName(filename)}.json`;

      assert(!!jsonFile, `no corresponding rule file for ${r}`);

      let rawRule = fs.readFileSync(jsonFile, 'utf8');

      let {
        enabled,
        order = 0,
        stage = "login_success",
      } = JSON.parse(rawRule);

      if (!enabled) {
        return undefined;
      }

      let code = fs.readFileSync(filename, {
        encoding: "utf-8",
      });

      return { code, filename, order, stage };
    })
    .flatMap(x => !!x ? x : [])
    .sort((left, right) => left.order - right.order) ?? [];
}
