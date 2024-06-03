import { createSchema, slice as immerSlice } from "starfx";
import type { FxSchema, BaseSchema, FxMap, QueryState } from "starfx";

export type SimulationSlice = typeof immerSlice;
export type SimulationInputSchema<T extends Record<string, any>> = (args: { slice: SimulationSlice }) => ToMap<T>;

export type Loaders<Schema> = Schema extends FxSchema<any, infer L> ? L : never;

export type ToMap<T> = { [key in keyof T]: (name: string) => BaseSchema<T[key]> };

export type SimulationSchema<Input extends Record<string, any>> = FxSchema<QueryState & Input, FxMap & ToMap<Input>>;

export function generateSchemaWithInputSlices<T extends Record<string, any>>(inputSchema: SimulationInputSchema<T>) {
  let slices = inputSchema({ slice: immerSlice });

  return createSchema({
    cache: immerSlice.table({ empty: {} }),
    loaders: immerSlice.loaders(),
    ...slices,
  });
}

export type SimulationSchemaSlices = ReturnType<
  typeof generateSchemaWithInputSlices
>;
