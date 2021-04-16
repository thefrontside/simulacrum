import { Operation, Stream, Task, on, sleep } from 'effection';
import type { Process } from '@effection/node';
import { main, exec, daemon, StdIO } from '@effection/node';
import { watch } from 'chokidar';

main(function* (scope: Task) {
  let watcher = watch('./src/**/*.ts', { ignoreInitial: true, ignored: 'dist' });
  try {
    let process: Task = scope.spawn(buildAndRun);

    yield on(watcher, 'all').forEach(() => {
      process.halt();
      process = scope.spawn(function*() {
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

function executeAndOut(command: string): Operation<void> {
  return function* (task) {
    let p: Process = exec(`npm run ${command}`).run(task);
    task.spawn(writeOut(p.stdout, process.stdout));
    task.spawn(writeOut(p.stderr, process.stderr));
    yield p.expect();
  };
}

function* buildAndRun(scope: Task) {
  try {
    yield executeAndOut('clean');
    yield executeAndOut('prepack');

    let server: StdIO = daemon('node dist/start.js').run(scope);
    scope.spawn(writeOut(server.stdout, process.stdout));
    scope.spawn(writeOut(server.stderr, process.stderr));
  } catch (err) {
    console.error(err);
  }

  yield;
}
