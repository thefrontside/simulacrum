import { Operation, Stream, Task, main, on, sleep, spawn } from 'effection';
import { exec, daemon, StdIO } from '@effection/process';
import { watch } from 'chokidar';

main(function* (scope: Task) {
  if (!process.env.PORT) process.env.PORT = '4000';

  let watcher = watch(['../server/src/**/*.ts', './src/**/*.ts'], { ignoreInitial: true, ignored: 'dist' });
  try {
    let process: Task = scope.run(buildAndRun);

    yield on(watcher, 'all').forEach(() => {
      process.halt();
      process = scope.run(function*() {
        yield sleep(10);
        console.log('rebuilding.....');
        yield buildAndRun;
      });
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
    console.error(err);
  }

  yield;
}
