import { Operation, Stream, Task, on, sleep, spawn } from 'effection';
import { main, exec, daemon, StdIO } from '@effection/node';
import { watch } from 'chokidar';
import {logger} from '@simulacrum/logger';

main(function*(scope) {
  let watcher = watch('./src/**/*.ts', { ignoreInitial: true, ignored: 'dist' });
  try {
    let process: Task = yield spawn(buildAndRun);

    yield on(watcher, 'all').forEach(function*() {
      yield process.halt();
      process = yield spawn(function*() {
        yield sleep(10);
        logger.debug('rebuilding.....');
        yield buildAndRun;
      }).within(scope);
    });
  } finally {
    watcher.close();
  }
});

function writeOut(channel: Stream<string>, out: NodeJS.WriteStream) {
  return channel.forEach(function (data) {
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

function* executeAndOut(command: string): Operation<void> {
  let { stdout, stderr, expect } = yield exec(`npm run ${command}`);
  yield spawn(writeOut(stdout, process.stdout));
  yield spawn(writeOut(stderr, process.stderr));
  yield expect();
}

function* buildAndRun() {
  try {
    yield executeAndOut('clean');
    yield executeAndOut('prepack');

    let server: StdIO = yield daemon('node dist/start.js');
    yield spawn(writeOut(server.stdout, process.stdout));
    yield spawn(writeOut(server.stderr, process.stderr));
  } catch (err) {
    logger.error(err);
  }

  yield;
}
