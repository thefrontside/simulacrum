import type { ProcessCommand } from "./launch-metadata.ts";
import { withResolvers, type WithResolvers } from "effection";

export type ServiceState = "waiting" | "starting" | "ready" | "stopping" | "failed";

export type ServiceExit = {
  requestedSignal?: string;
  code?: number;
  signal?: string;
};

export type ServiceInfo = {
  state: ServiceState;
  port?: number | undefined;
  // PID is relative to the process namespace in which the graph runs.
  pid?: number | undefined;
  command?: { executable: string; arguments: string[]; shell?: boolean | string } | undefined;
  launcher?: ProcessCommand | undefined;
  requestedSignal?: string | undefined;
  lastExit?: ServiceExit | undefined;
};

export class ServiceStatusRecord {
  #info: ServiceInfo;
  startup: WithResolvers<void> = withResolvers<void>();
  running: WithResolvers<void> = withResolvers<void>();

  constructor(info: Partial<ServiceInfo> = {}) {
    this.#info = { state: "waiting", ...info };
  }

  get state(): ServiceState {
    return this.#info.state;
  }

  get pid(): number | undefined {
    return this.#info.pid;
  }

  get port(): number | undefined {
    return this.#info.port;
  }

  get command(): ServiceInfo["command"] {
    return this.#info.command;
  }

  get launcher(): ProcessCommand | undefined {
    return this.#info.launcher;
  }

  get lastExit(): ServiceInfo["lastExit"] {
    return this.#info.lastExit;
  }

  update(info: Partial<ServiceInfo>): void {
    if ("pid" in info && info.pid === undefined && this.#info.pid !== undefined) {
      delete this.#info.pid;
      delete this.#info.command;
    } else if (info.pid !== undefined) {
      this.#info.pid = info.pid;
    }

    if (info.command !== undefined) this.#info.command = info.command;
    if (info.launcher !== undefined) this.#info.launcher = info.launcher;
    if (info.requestedSignal !== undefined) this.#info.requestedSignal = info.requestedSignal;
    if ("requestedSignal" in info && info.requestedSignal === undefined) {
      delete this.#info.requestedSignal;
    }
    if (info.lastExit !== undefined) this.#info.lastExit = info.lastExit;
    if (info.port !== undefined) this.#info.port = info.port;
    if (info.state !== undefined) {
      this.#info.state = info.state;
      if (info.state === "starting") delete this.#info.requestedSignal;
    }
  }

  clear(state?: ServiceState): void {
    delete this.#info.port;
    delete this.#info.pid;
    delete this.#info.command;
    if (state !== undefined) this.#info.state = state;
  }

  snapshot(): ServiceInfo {
    return { ...this.#info };
  }
}
