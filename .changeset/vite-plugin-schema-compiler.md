---
'@foldkit/vite-plugin': minor
---

The plugin can now compile Schemas ahead of time. Pass `schemaCompiler` with the modules that export your Schemas, and `vite build` turns each exported Schema into a static parser using Effect's `SchemaAOTCompiler`. The built client installs those parsers before the entry runs, so `Schema.decode*` calls on them no longer walk the Schema at runtime. The code that decodes does not change.

```ts
foldkit({
  schemaCompiler: {
    modules: ['/src/schema/api.ts', '/src/schema/model.ts'],
    operations: ['decode', 'encode'],
  },
})
```

Measured on one desktop machine, decoding a 1,000-item API response in a production build went from 1.41 ms to 0.14 ms in headless Chromium, and in Node it allocated 214 KB per call instead of 1.1 MB. The Kanban example, with three Schemas compiled for decoding and encoding, grew by 4.5 KB gzipped.

Previously every Schema in a Foldkit app was interpreted. Running Effect's compiler by hand needed a separate build script that could import TypeScript modules and resolve the project's aliases, and the generated file had to be imported by hand before any parser ran.

The listed modules are imported in Node during the build, with the project's resolve settings and without its other plugins, so they must not render views, touch the DOM, or start the Runtime. They must also build the same Schemas in Node as in the browser, so a Schema that branches on `import.meta.env.SSR` or `typeof window` is compiled from its Node definition and decodes browser data against the wrong shape. Module paths resolve like imports in the project, such as `'/src/schema/api.ts'` or an alias. Only direct Schema exports are compiled roots; Schemas nested inside them are compiled too. `operations` defaults to `['decode']` and also accepts `'encode'`, `'is'`, and `'make'`. A listed module that cannot be resolved or loaded fails the build.

The plugin installs the parsers through each HTML page. A client build with no HTML entry warns and ships without them until its entry imports `virtual:foldkit/schema-compiler` first, with `declare module 'virtual:foldkit/schema-compiler' {}` in a declaration file for TypeScript. The dev server and server builds resolve that import to an empty module. The generated module is kept in memory, so `vite build --watch` recompiles on each rebuild without writing into the project.

The dev server and server builds keep interpreting. The compiler is part of Effect's unstable API, so Schema features it does not handle yet fall back to the interpreter, and its output can change between Effect releases.

`foldkitSchemaCompiler`, `FoldkitSchemaCompilerOptions`, `SchemaCompilerOperation`, and `FOLDKIT_SCHEMA_COMPILER_MODULE_ID` are exported for projects that compose the plugins themselves.
