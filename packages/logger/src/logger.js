"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LoggerTypes = void 0;
const chalk_1 = __importDefault(require("chalk"));
var LoggerTypes;
(function (LoggerTypes) {
    LoggerTypes["warn"] = "warn";
    LoggerTypes["debug"] = "debug";
    LoggerTypes["info"] = "info";
    LoggerTypes["error"] = "error";
    LoggerTypes["start"] = "start";
    LoggerTypes["done"] = "done";
})(LoggerTypes = exports.LoggerTypes || (exports.LoggerTypes = {}));
const logTypes = {
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
const write = (type, text, verbose) => {
    let textToLog = "";
    let logObject = false;
    let logType = logTypes[type];
    textToLog += `${chalk_1.default[logType.bg].black(logType.msg.padEnd(8))} ${chalk_1.default[logType.text](text)}`;
    if (verbose) {
        if (typeof verbose === "object") {
            logObject = true;
        }
        else {
            textToLog += `\n\n${verbose}`;
        }
    }
    console.log(textToLog);
    if ([LoggerTypes.start, LoggerTypes.done, LoggerTypes.error].indexOf(type) > -1) {
        console.log();
    }
    if (logObject) {
        console.dir(verbose, { depth: 15 });
    }
};
const log = (text = "") => console.log(text);
const start = (text) => {
    write(LoggerTypes.start, text);
};
const done = (text) => {
    write(LoggerTypes.done, text);
};
const info = (text) => {
    write(LoggerTypes.info, text);
};
const debug = (text, data) => {
    write(LoggerTypes.debug, text, data);
};
const warn = (text, data) => {
    write(LoggerTypes.warn, text, data);
};
const error = (err) => {
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
exports.logger = {
    log,
    info,
    debug,
    warn,
    error,
    start,
    done,
};
//# sourceMappingURL=logger.js.map