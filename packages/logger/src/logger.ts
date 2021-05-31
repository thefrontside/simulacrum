import chalk, { BackgroundColor, ForegroundColor } from "chalk";

export enum LoggerTypes {
  warn = "warn",
  debug = "debug",
  info = "info",
  error = "error",
  start = "start",
  done = "done",
}

export type LoggerType = {
  [key in LoggerTypes]: {
    bg: typeof BackgroundColor;
    msg: string;
    text: typeof ForegroundColor;
  };
};

const logTypes: LoggerType = {
  warn: {
    bg: "bgYellow",
    msg: " WARNING ",
    text: "yellow",
  },
  debug: {
    bg: "bgMagenta",
    msg: " DEBUG ",
    text: "magenta",
  },
  info: {
    bg: "bgCyan",
    msg: " INFO ",
    text: "cyan",
  },
  error: {
    bg: "bgRed",
    msg: " ERROR ",
    text: "red",
  },
  start: {
    bg: "bgBlue",
    msg: " START ",
    text: "blue",
  },
  done: {
    bg: "bgGreen",
    msg: " DONE ",
    text: "green",
  },
};

const write = (type: LoggerTypes, text: string | Error, verbose?: unknown) => {
  let textToLog = "";
  let logObject = false;

  let logType = logTypes[type];

  textToLog += `${chalk[logType.bg].black(logType.msg.padEnd(8))} ${chalk[
    logType.text
  ](text)}`;

  if (verbose) {
    if (typeof verbose === "object") {
      logObject = true;
    } else {
      textToLog += `\n\n${verbose}`;
    }
  }

  console.log(textToLog);
  if (
    [LoggerTypes.start, LoggerTypes.done, LoggerTypes.error].indexOf(type) > -1
  ) {
    console.log();
  }

  if (logObject) {
    console.dir(verbose, { depth: 15 });
  }
};

const log = (text = "") => console.log(text);

const start = (text: string) => {
  write(LoggerTypes.start, text);
};

const done = (text: string) => {
  write(LoggerTypes.done, text);
};

const info = (text: string) => {
  write(LoggerTypes.info, text);
};

const debug = (text: string, data?: unknown) => {
  write(LoggerTypes.debug, text, data);
};

const warn = (text: string, data?: unknown) => {
  write(LoggerTypes.warn, text, data);
};

const error = (err: string | Error) => {
  if (typeof err === "string") {
    write(LoggerTypes.error, err);
    return;
  }

  if (err.message) {
    write(LoggerTypes.error, err.message);
  }

  write(LoggerTypes.error, err);
  if (err.stack) {
    write(LoggerTypes.error, err.stack);
  }
};

export const logger = {
  log,
  info,
  debug,
  warn,
  error,
  start,
  done,
} as const;
