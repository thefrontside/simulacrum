import { Operation, Task, main, on, sleep, spawn } from 'effection';
import { exec, daemon, Process, StdIO } from '@effection/process';
import { watch } from 'chokidar';

main(function* (scope: Task) {
  if (!process.env.PORT) process.env.PORT = '4000';

  let watcher = watch(['../server/src/**/*.ts', './src/**/*.ts'], { ignoreInitial: true, ignored: 'dist' });
  try {
    let process: Task = yield scope.spawn(buildAndRun);

    yield on(watcher, 'all').forEach(function*() {
      yield process.halt();
      process = yield scope.spawn(function*() {
        yield sleep(10);
        console.log('rebuilding.....');
        yield buildAndRun;
      });
    });
  } finally {
    watcher.close();
  }
});

function* executeAndOut(command: string): Operation<void> {
  let { stdout, stderr, expect }: Process = yield exec(`npm run ${command}`);
  yield spawn(stdout.forEach(line => { process.stdout.write(line); }))
  yield spawn(stderr.forEach(line => { process.stderr.write(line); }))
  yield expect();
}

function* buildAndRun() {
  try {
    yield executeAndOut('clean');
    yield executeAndOut('prepack');

    let server: StdIO = yield daemon('node dist/start.js');
    yield spawn(server.stdout.forEach(line => { process.stdout.write(line); }))
    yield spawn(server.stderr.forEach(line => { process.stderr.write(line); }))
  } catch (err) {
    console.error(err);
  }

  yield;
}
