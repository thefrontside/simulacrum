const actions = ({ thunks, schema }) => {
  let upsertTest = thunks.create("user:upsert", function* boop(ctx, next) {
    yield* schema.update(schema.test.add({ [ctx.payload.id]: ctx.payload }));

    yield* next();
  });

  return { upsertTest };
};

const schema = ({ slice }) => {
  let slices = {
    test: slice.table(),
    booping: slice.str(),
    boop: slice.num(),
  };
  return slices;
};

export const extendStore = {
  actions,
  schema,
};
