/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import path from "path";
import fs from "fs";
import vm from "vm";
import assert from "assert-ts";
import { extensionlessFileName } from './utils';
import { RuleMeta } from './types';

const RulesPath = path.join(__dirname, '..', '..', 'rules');

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createRulesRunner = () => {
  let ruleFiles = fs
    .readdirSync(RulesPath)
    .filter((f) => path.extname(f) === ".js");

  let rules =
    ruleFiles
      .map((p) => {
        let filename = path.join(RulesPath, p);

        let jsonFile = `${extensionlessFileName(filename)}.json`;

        assert(!!jsonFile, `no corresponding rule file for ${p}`);

        let {
          enabled,
          order = 0,
          stage = "login_success",
        }: // eslint-disable-next-line @typescript-eslint/no-var-requires
        RuleMeta = require(jsonFile);

        if (!enabled) {
          return undefined;
        }

        let code = fs.readFileSync(filename, {
          encoding: "utf-8",
        });

        return { code, filename, order, stage };
      })
      .filter(Boolean)
      .sort((left, right) => {
        assert(!!left && !!right, `either left or right is underfined`);

        return left.order - right.order;
      }) ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let callback = (_a: any, user:any) => {
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (user: any, context: Record<string, any>) => {
    console.debug(`applying ${rules.length} rules`);

    let vmContext = vm.createContext({
      process,
      Buffer,
      clearImmediate,
      clearInterval,
      clearTimeout,
      setImmediate,
      setInterval,
      setTimeout,
      console,
      require,
      module,
      __simulator: {
        ...{
          user,
          context: { ...context, },
          callback,
        },
      },
    });

    for (let rule of rules) {
      assert(typeof rule !== "undefined", "undefined rule");

      let { code, filename } = rule;

      console.debug(`executing rule ${path.basename(filename)}`);

      let script = new vm.Script(
        `(function(exports) {
            (${code})(__simulator.user, __simulator.context, __simulator.callback)
          }
          (module.exports));
        `
      );

      script.runInContext(vmContext, {
        filename,
      });
    }
  };
};
