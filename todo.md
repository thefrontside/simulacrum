# Auth0 simulator config work — tracking

## Resolved
- [x] `normalized()` wrapper fixes `inject()` bypass (old configliere's `inject` calls `inspect` directly).
- [x] CLI precedence documented to match old configliere: env vars > CLI flags > config file.
- [x] `paseo.json` added to `.gitignore`.
- [x] Migrated packages/auth0 to configliere preview @6935534 (two-phase parse, `fromValues()` reader,
      `auth0App({values})` factory; `normalizeConfig`/`getConfig` untouched). Envs accepted in
      `getCLIConfig` input but not read (forward-compat placeholder).
- [x] **Migrated packages/auth0 to configliere preview @064f111 (full phase-protocol rework).**
      Tokenizer `claimPair` patch no longer needed (fixed upstream; patch machinery removed).
      New shape in `get-config.ts`:
      - `auth0App()` — config option (with `env("")` so an ambient `CONFIG` var can't be read as
        a file path) → `checkpoint()` → nine field options → `routes(start)` with the same fields.
        Values/envs are native parse inputs now; `fromValues()` reader wrapper is gone.
      - `getCLIConfig` — parse suspends at the checkpoint; help/version are detected from raw
        argv (`requestedMethod`) so a config file is never loaded for them; execute resumes with
        the file values (`Result<ValueSource[]>`) → CLI > env > config-file precedence natively.
      - `getConfig(options)` — options threaded as parse `values` + empty resume.
      - Merge of root + subcommand models strips child `undefined`s (child re-claims params with
        distinct claim IDs and would otherwise shadow root-settled values). This also fixes a
        latent old-code bug where a pre-`start` CLI value was clobbered by a file claim.
      - Tests: 67 pass (62 prior + 5 new: env fallback, env>file, cli>env, start+file, no
        `CONFIG` env leak). tsc, oxlint, build/attw/publint all clean.
- [x] All 62 auth0 tests pass (`--no-file-parallelism` + `NODE_OPTIONS=--use-system-ca`, both pre-existing).
- [x] Dropped `compose()` — fields bundle into one `auth0Fields(values)` element; both pipelines
      are plain positional `route()` calls within the typed arity.
- [x] Zod schema moved out of types.ts into get-config.ts: `fieldDefs` table is now the single
      source of truth (description/aliases/schema); `Auth0Configuration` is a hand-written type.
      Validation happens once at binding (CLI strings decoded via schema; file values validated
      too), so `finalize()` no longer re-parses. Phase-two parse can legitimately fail on bad
      config files → both entry points surface binding issues instead of "unreachable" guards.

## Configliere preview "Project Tom Hagen" (@6935534)
Ground-up rebuild as typed request router. Now the live dependency of @simulacrum/auth0-simulator.

### Upstream bug found & patched
- `Tokenizer.claimPair` never advanced `previous` after a failed match, so pairs were tested as
  `(first-token, tk)` — any `--flag value` preceded by another token failed ("requires a value" +
  "unexpected"), and a leading flag could mis-pair with a non-adjacent word. Fix: advance
  `previous = token` on failed match (strict adjacency). Carried in `patches/configliere.patch`
  via `patchedDependencies` in pnpm-workspace.yaml (pnpm ≥10 ignores it in sub-package.json).
  **Should be reported/fixed upstream** (configliere PR #20 / repo issues).

### Costs / caveats
- [x] **Variadic-tuple alternative to the 30 overloads investigated & benchmarked** (bench harness
      in /var/folders/.../opencode/pipe-bench): checked-chaining via `Chained`/`OutputOf` collapses
      whenever an element's own generics must be inferred inline (e.g. `option("port")` inside the
      pipeline) — TS can't do arg-inference + tuple-inference + deferred conditional in one pass;
      pre-bound elements work but output types degrade to constraint instantiations and cost
      ~4.6x more instantiations (827K vs 180K for 240 pipelines, ~2x check time).
- [x] **Delta design found that DOES work** (pipe-bench/delta.ts): elements are callable but carry
      a type-level delta tag resolved eagerly at their own call site (`{k:"param", s:name}` etc.);
      `route()` folds concrete deltas in one linear pass — no nested inference, no deferred
      conditional in the inference path. Inline usage compiles with full precision (exact param
      keys/methods/children threading, wrong keys rejected), and costs ~1.7x ladder instantiations
      / ~1.2x check time (313K vs 180K, 0.69s vs 0.58s for 240 pipelines).
- [x] **Delta scaling measured + TS2589 fixed** (pipe-bench/scale.mjs): first fold version died at
      ~100 elements (`Type instantiation is excessively deep`) because re-wrapping the accumulated
      Route forced a conditional (`ParamsOf<R>`) to resolve the whole lineage each step. Threading
      a flat State record (indexed accesses only, Route built once at the end) removed it:
      5→500 elements all compile; wall ~1000-1500 (TS tail-call budget). Per-call cost grows
      superlinearly (params intersections accumulate): depth 10 ≈ 0.7K inst / 3ms; depth 50 ≈
      5.4K / 9ms; depth 100 ≈ 15.7K / 23ms. Ladder stays linear but hard-caps at 31.
      Branch order in `Apply` mattered ~1.9x on the old design; method-first won.
- [x] **Envs wired natively** — `parse(app, { argv, envs })` landed in @562cb6a+; `getCLIConfig`
      passes envs straight through (env keys: `PORT`, `CLIENT_ID`, `DOMAIN`, … upper-snake,
      un-prefixed; child routes get `START_PORT`-style keys). Placeholder removed.
- [ ] Extension surface (`Param.cli`, `ReadCLI`, `CLIRead`) is exported but young.
- [ ] Package still published as `configliere@0.4.0-pr…` (README says `@frontside/configliere`).
- [x] Absent optionals arrive as explicit `undefined` (not omitted) — `finalize()` strips them
      so field defaults aren't shadowed.
- [ ] **Upstream TS2589 budget (064f111): nine options exceed the instantiation budget** in the
      delta `Fold`/`Materialize` pipeline — fails in every construction style (variadic inline,
      tuple spread, manual chaining) once the type is actually consumed; plain `z.string()`
      schemas too. Workaround: runtime app is built with shallow `AnyRoute` intermediates and
      `auth0App()` anchors its return to a hand-written structural `Route` type (phases carry
      the checkpoint resolver + typed models, so suspended/execute intents stay typed).
      **Worth reporting upstream** — affects any ~8+ option CLI.
- [ ] **Upstream behavior change:** config-file values are claimed per-route-path, so subcommand
      routes read *nested* keys (`{ start: { port } }`) from a root-mounted value source; our
      merge instead relies on the root binding (which reads flat keys post-checkpoint).
      README documents the nested shape as intended.

## Pre-existing test environment issues (not from migration)
- [ ] Self-signed cert: Node 24 rejects leaf → tests need `NODE_OPTIONS=--use-system-ca`.
      Fails identically at pristine HEAD.
- [ ] Suites share a fixed port-3000 server (test/helpers.ts); parallel file runs collide →
      run vitest with `--no-file-parallelism` (or make ports dynamic per suite).

## Upstream implementation handoff
- [ ] `delta-pipeline-handoff.md` (repo root) — self-contained doc for an agent to implement the
      delta fold in configliere upstream: reference impl, integration notes (schema-typed param
      values, multi-mount ParamsDelta generalization), gotchas (TS2589/State fix, branch order,
      spread footgun), error-gallery parity, perf baselines, acceptance checklist.

## Open design notes (current implementation)
- [ ] **`simulation({ config })` bypasses normalization** — raw object skips domain/port derivation
      and conflict check; undefined port falls back to foundation's 9000 silently.
- [ ] **`port` typed required but parseable-as-undefined** until `normalizeConfig` runs.
- [ ] **README doesn't document `simulation({ config })` or `getCLIConfig`** — decide whether/how.
- [ ] **Passing both `config` and `options`** — `config` wins silently. Document or assert.
- [ ] **Duplicate flags now error instead of last-wins** — behavior change vs old configliere;
      confirm intentional for release notes.
