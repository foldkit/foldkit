# @foldkit/vite-plugin

## 0.2.4

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.2.3

### Patch Changes

- 6b6895d: Skip full-reload for file changes outside the module graph (e.g. editor temp files, MCP tool logs) by checking the `modules` array before sending the reload signal.

## 0.2.2

### Patch Changes

- 4b81a10: Update GitHub URL from `devinjameson/foldkit` to `foldkit/foldkit` following org transfer.
