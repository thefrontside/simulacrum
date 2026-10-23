import { createContext } from "effection";
import type { ProcessCommand } from "./launch-metadata.ts";

export const GraphLauncher = createContext<ProcessCommand | undefined>("GraphLauncher");
