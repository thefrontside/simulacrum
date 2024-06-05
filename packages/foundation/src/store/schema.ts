import { createSchema, slice as immerSlice } from "starfx";

type SimulationSlice = typeof immerSlice;
export type ExtendSimulationSchema = {
  slice: SimulationSlice;
};
export type ExtendSimulationSchemaInput<T> = ({
  slice,
}: ExtendSimulationSchema) => T;

export function generateSchemaWithInputSlices<ExtendedSimulationSchema>(
  inputSchema: ExtendSimulationSchemaInput<ExtendedSimulationSchema>
) {
  let slices = inputSchema({ slice: immerSlice });

  let schemaAndInitialState = createSchema({
    cache: immerSlice.table({ empty: {} }),
    loaders: immerSlice.loaders(),
    ...slices,
  });

  return schemaAndInitialState;
}
