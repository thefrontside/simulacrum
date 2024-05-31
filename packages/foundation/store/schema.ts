import { createSchema, slice as immerSlice } from "starfx";

export type SimulationSlice = typeof immerSlice;
export type SimulationInputSchema = (args: {
  slice: SimulationSlice;
}) => SimulationSchemaSlicesSansBase;
export type SimulationSchemaSlicesSansBase = Omit<
  Parameters<typeof createSchema>[0],
  "loaders" | "cache"
>;

export function generateSchemaWithInputSlices<
  ExtendedStoreSchema extends SimulationInputSchema
>(inputSchema?: ExtendedStoreSchema) {
  let slices = inputSchema ? inputSchema({ slice: immerSlice }) : {};

  return createSchema({
    cache: immerSlice.table({ empty: {} }),
    loaders: immerSlice.loaders(),
    ...slices,
  });
}

export type SimulationSchemaSlices = ReturnType<
  typeof generateSchemaWithInputSlices
>;
