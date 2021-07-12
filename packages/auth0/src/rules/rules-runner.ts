import type { UserData } from 'auth0';
import path from "path";
import vm from "vm";
import assert from "assert-ts";
import { parseRulesFiles } from './parse-rules-files';

type RulesRunner = (user: UserData, context: Record<string, unknown>) => void;

export function createRulesRunner (rulesPath?: string): RulesRunner {
  let callback = () => {};

  if(typeof rulesPath === 'undefined') {
    return callback;
  }

  let rules = parseRulesFiles(rulesPath);

  if(rules.length === 0) {
    return callback;
  }

  return (user: UserData, context: Record<string, unknown>) => {
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
