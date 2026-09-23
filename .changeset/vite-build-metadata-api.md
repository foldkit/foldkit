---
'@foldkit/vite-plugin': minor
---

Expose completed build metadata through the `foldkit:build` plugin's `api.getBuildMetadata()`. Deployment integrations can read the resolved output directories, emitted fetch-handler path, and successfully prerendered routes after `await builder.buildApp()` succeeds, without locating and reading `foldkit.build.json` themselves. `FoldkitBuildApi` types the plugin API, and `FoldkitBuildMetadata` exports the serializable result's Schema and inferred type.

Use Vite's `sharedDuringBuild` to keep captures in the build plugin instance instead of a process-global registry. Starting another client or server build invalidates the previous result. Metadata is published only after prerendering and manifest writing succeed, and output paths follow the resolved environment configurations, including host overrides.

The portable version-1 disk manifest, existing plugin API fields, and generated fetch-handler contract remain available. Create a fresh plugin set for each independent builder and read metadata only after the full build resolves successfully.
