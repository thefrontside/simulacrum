import { BackgroundColor, ForegroundColor } from "chalk";
export declare enum LoggerTypes {
    warn = "warn",
    debug = "debug",
    info = "info",
    error = "error",
    start = "start",
    done = "done"
}
export declare type LoggerType = {
    [key in LoggerTypes]: {
        bg: typeof BackgroundColor;
        msg: string;
        text: typeof ForegroundColor;
    };
};
export declare const logger: {
    readonly log: (text?: string) => void;
    readonly info: (text: string) => void;
    readonly debug: (text: string, data?: unknown) => void;
    readonly warn: (text: string, data?: unknown) => void;
    readonly error: (err: string | Error) => void;
    readonly start: (text: string) => void;
    readonly done: (text: string) => void;
};
//# sourceMappingURL=logger.d.ts.map