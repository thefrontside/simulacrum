import type { Rule } from 'auth0';
import { extensionlessFileName } from './extensionless-file-name';
import { assert } from 'assert-ts';
import fs from "fs";
import path from "path";


export function parseRulesFiles(rulesPath: string): {code: string, filename: string}[] {
  let ruleFiles = fs
  .readdirSync(RulesPath)
  .filter((f) => path.extname(f) === ".js");

  return ruleFiles
    .map((p) => {
      let filename = path.join(RulesPath, p);

      let jsonFile = `${extensionlessFileName(filename)}.json`;

      assert(!!jsonFile, `no corresponding rule file for ${p}`);

      let rawRule = fs.readFileSync(jsonFile, 'utf8');

      let {
        enabled,
        order = 0,
        stage = "login_success",
      }: Rule = JSON.parse(rawRule);

      if (!enabled) {
        return undefined;
      }

      let code = fs.readFileSync(filename, {
        encoding: "utf-8",
      });

      return { code, filename, order, stage };
    })
    .flatMap(x => !!x ? x : [])
    .sort((left, right) => {
      assert(!!left && !!right, `either left or right is underfined`);

      return left.order - right.order;
    }) ?? [];
}
