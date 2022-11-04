import path from 'path';
import vm from 'vm';
import fs from 'fs';
import { assert } from 'assert-ts';
import { parseRulesFiles } from './parse-rules-files';
import type { Rule, RuleContext, RuleUser } from './types';

export type RulesRunner = <A, I>(user: RuleUser, context: RuleContext<A, I>) => void;

async function runRule <A, I>(user: RuleUser, context: RuleContext<A, I>, rule: Rule) {
  await new Promise((resolve, reject) => {
    let sandbox = {
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
      resolve,
      reject,
      __simulator: {
        ...{
          user,
          context: { ...context },
        },
      },
    };

    let vmContext = vm.createContext(sandbox);
    assert(typeof rule !== 'undefined', 'undefined rule');

    let { code, filename } = rule;

    console.debug(`executing rule ${path.basename(filename)}`);

    let script = new vm.Script(`
      (async function(exports) {
        try {
          await (${code})(__simulator.user, __simulator.context, resolve);
        } catch (err) {
          console.error(err);
          reject();
        }
      })(module.exports)
    `);

    script.runInContext(vmContext, {
      filename,
      displayErrors: true,
      timeout: 20000,
    });
  }).catch((error) => console.error(error));
}

export function createRulesRunner(rulesPath?: string): RulesRunner {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let callback = (_user: RuleUser, _context: RuleContext<unknown, unknown>) => { };

  if (typeof rulesPath === 'undefined') {
    return callback;
  }

  let fullPath = path.join(process.cwd(), rulesPath);

  assert(fs.existsSync(fullPath), `no rules directory at ${fullPath}`);

  let rules = parseRulesFiles(rulesPath);

  if (rules.length === 0) {
    return callback;
  }

  return async <A, I>(user: RuleUser, context: RuleContext<A, I>) => {
    console.debug(`applying ${rules.length} rules`);

      for (let rule of rules) {
        await runRule(user, context, rule);
      }
  };
}
