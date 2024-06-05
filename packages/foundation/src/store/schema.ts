import { createSchema, slice as immerSlice } from "starfx";

export type SimulationSlice = typeof immerSlice;
export type ExtendSimulationSchemaInput<T> = ({
  slice,
}: {
  slice: SimulationSlice;
}) => T;

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
