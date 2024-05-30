import { createSchema, slice as immerSlice } from "starfx";

export type SimulationSlice = typeof immerSlice;
export type SimulationInputSchema = Parameters<
  typeof generateSchemaWithInputSlices
>[0];
type SimulationSchemaSlices = Omit<
  Parameters<typeof createSchema>[0],
  "loaders" | "cache"
>;

export function generateSchemaWithInputSlices(
  inputSchema: (args: { slice: SimulationSlice }) => SimulationSchemaSlices
) {
  let slices = inputSchema({ slice: immerSlice });

  return createSchema({
    cache: immerSlice.table({ empty: {} }),
    loaders: immerSlice.loaders(),
    boop: immerSlice.num(),
    ...slices,
  });
}
