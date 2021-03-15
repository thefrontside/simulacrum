import type { Operation, Task } from 'effection';
import type { Process } from '@effection/node';
import { main, exec, daemon, StdIO } from '@effection/node';
import { subscribe, Subscription } from '@effection/subscription';
import type { Channel } from '@effection/channel';
import { on } from '@effection/events';
import { watch } from 'chokidar';
import { Context } from 'vm';

main(function* (task) {
  let watcher = watch('./src/**/*.ts', { ignoreInitial: true });
  try {
    let process: Context = yield task.spawn(buildAndRun(task, 500));

    let events: Subscription<[string]> = yield on(watcher, 'all');

    while (true) {
      let next: IteratorResult<[string]> = yield events.next();

      if (next.done) {
        break;
      } else {
        console.log('buidling.....');
        process.halt();
        process = yield task.spawn(buildAndRun(task, 100));
      }
    }
  } finally {
    watcher.close();
  }
});

function writeOut(task: Task, channel: Channel<string>, out: NodeJS.WriteStream) {
  return subscribe(task, channel).forEach(function (data) {
    return new Promise((resolve, reject) => {
      out.write(data, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

function* executeAndOut(task: Task, command: string): Operation<Context> {
  let p: Process = yield exec(task, `yarn ${command}`);
  yield task.spawn(writeOut(task, p.stdout, process.stdout));
  yield task.spawn(writeOut(task, p.stderr, process.stderr));
  yield p.expect();
}

function* buildAndRun(task: Task, delay = 0): Operation<Context> {
  try {
    yield executeAndOut(task, 'clean');
    yield executeAndOut(task, 'generate');
    yield timeout(delay);
    let server: StdIO = yield daemon(task, 'node dist/server/server.js');
    yield task.spawn(writeOut(task, server.stdout, process.stdout));
    yield task.spawn(writeOut(task, server.stderr, process.stderr));
  } catch (err) {
    console.error(err);
  }

  yield;
}
