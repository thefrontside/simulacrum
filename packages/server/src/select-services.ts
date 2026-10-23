type ServiceWithDependencies = {
  dependsOn?: { startup: readonly string[] };
};

export type ServiceSelection<S> = {
  services: S;
  requested: Set<string> | undefined;
  excluded: Set<string>;
  selected: Set<string>;
  filtered: boolean;
};

export function selectServices<S extends Record<string, ServiceWithDependencies>>(
  services: S,
  subset?: Array<keyof S>,
  exclude?: string[],
): ServiceSelection<S> {
  const nodes = Object.keys(services);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  // Reject startup dependency cycles before applying any filters.
  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error("Cycle detected in services");
    visiting.add(name);
    for (const dependency of services[name].dependsOn?.startup ?? []) {
      if (dependency in services) visit(dependency);
    }
    visiting.delete(name);
    visited.add(name);
  }

  for (const name of nodes) {
    visit(name);
  }

  // Normalize user filters and validate excluded names.
  const requested = subset
    ? new Set(subset.map((name) => String(name).trim()).filter(Boolean))
    : undefined;
  const excluded = new Set((exclude ?? []).map((name) => name.trim()).filter(Boolean));

  for (const name of excluded) {
    if (!(name in services)) throw new Error(`Excluded service '${name}' not found`);
  }

  const filtered = requested !== undefined || excluded.size > 0;
  if (!filtered) {
    return {
      services,
      requested,
      excluded,
      selected: new Set(nodes),
      filtered,
    };
  }

  // Start with requested services (or all services) and include startup dependencies.
  const selected = requested ? new Set<string>() : new Set(nodes);

  function include(name: string) {
    if (selected.has(name)) return;
    if (!(name in services)) throw new Error(`Requested service '${name}' not found`);
    selected.add(name);
    for (const dependency of services[name].dependsOn?.startup ?? []) {
      include(dependency);
    }
  }

  for (const name of requested ?? []) {
    include(name);
  }

  // Apply exclusions, then remove services whose startup dependencies are missing.
  for (const name of excluded) {
    selected.delete(name);
  }

  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const name of Array.from(selected)) {
      const dependencies = services[name].dependsOn?.startup ?? [];
      if (dependencies.some((dependency) => !selected.has(dependency))) {
        selected.delete(name);
        pruned = true;
      }
    }
  }

  // A requested service cannot silently disappear during exclusion pruning.
  for (const name of requested ?? []) {
    if (!selected.has(name)) {
      throw new Error(
        `Requested service '${name}' cannot be started because it or one of its startup dependencies is excluded`,
      );
    }
  }

  // Build the typed service map for the selected graph.
  const picked: Partial<S> = {};
  for (const name of selected) {
    picked[name as keyof S] = services[name as keyof S];
  }

  return { services: picked as S, requested, excluded, selected, filtered };
}
