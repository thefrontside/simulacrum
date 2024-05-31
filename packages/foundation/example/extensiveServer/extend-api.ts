export const extend = (router, simulationStore) => {
  router.get("extended-route", (req, res) => {
    let dogs = simulationStore.schema.boop.select(
      simulationStore.store.getState()
    );
    res.status(200).json({ dogs });
  });
};
