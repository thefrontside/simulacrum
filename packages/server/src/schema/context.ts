import { Slice } from '@effection/atom';
import { Task } from 'effection';
import { ServerState } from '../interfaces';

export interface OperationContext {
  scope: Task;
  atom: Slice<ServerState>;
  newid(): string;
}
