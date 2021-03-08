import { Operation, Task, run as _run} from 'effection';
import { beforeEach, afterEach } from 'mocha';

export let world: Task;

beforeEach(() => { world = _run() });

afterEach(async () => {
  await world.halt();
});

export async function run<T>(operation: Operation<T>): Promise<T> {
  return world.spawn(operation);
}
