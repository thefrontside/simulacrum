import path from "path";
import vm from "vm";
import fs from 'fs';
import { assert } from "assert-ts";
import { parseRulesFiles } from './parse-rules-files';
import type { RuleContext, RuleUser } from './types';

export type RulesRunner = <A, I>(user: RuleUser, context: RuleContext<A, I>) => void;

export function createRulesRunner (rulesPath?: string): RulesRunner {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let callback = (_user: RuleUser, _context: RuleContext<unknown, unknown>) => {};

  if(typeof rulesPath === 'undefined') {
    return callback;
  }

  let fullPath = path.join(process.cwd(), rulesPath);

  assert(fs.existsSync(fullPath), `no rules directory at ${fullPath}`);

  let rules = parseRulesFiles(rulesPath);

  if(rules.length === 0) {
    return callback;
  }

  return <A, I>(user: RuleUser, context: RuleContext<A, I>) => {
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
}
