import { buildSync } from 'esbuild'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

// NOTE: Monaco's TypeScript service runs in a Web Worker. We can't use
// Vite's native `?worker` import because in dev Vite hard-codes module
// workers (`new Worker(url, { type: "module" })`), and a module worker
// loaded by our COEP-credentialless `/playground/*` page gets blocked
// (`blocked:COEP-framed-resource`). So we bundle each Monaco worker as
// a classic IIFE script with esbuild, serve it in dev with the right
// headers, and emit it at the same path in prod so the shim baked into
// `index.html` resolves there in both modes.
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const WEBSITE_ROOT = resolve(SCRIPT_DIRECTORY, '..')

type WorkerEntry = Readonly<{
  label: string
  entry: string
  filename: string
}>

const WORKERS: ReadonlyArray<WorkerEntry> = [
  {
    label: 'editorWorkerService',
    entry: 'monaco-editor/esm/vs/editor/editor.worker.js',
    filename: 'editor.worker.bundle.js',
  },
  {
    label: 'typescript',
    entry: 'monaco-editor/esm/vs/language/typescript/ts.worker.js',
    filename: 'ts.worker.bundle.js',
  },
  {
    label: 'json',
    entry: 'monaco-editor/esm/vs/language/json/json.worker.js',
    filename: 'json.worker.bundle.js',
  },
  {
    label: 'css',
    entry: 'monaco-editor/esm/vs/language/css/css.worker.js',
    filename: 'css.worker.bundle.js',
  },
  {
    label: 'html',
    entry: 'monaco-editor/esm/vs/language/html/html.worker.js',
    filename: 'html.worker.bundle.js',
  },
]

const PUBLIC_PATH = '/monacoworkers'
const CACHE_DIR = resolve(WEBSITE_ROOT, 'node_modules/.monaco-workers')

const workerUrl = (filename: string): string => `${PUBLIC_PATH}/${filename}`

const labelToWorkerUrl: Readonly<Record<string, string>> = {
  editorWorkerService: workerUrl('editor.worker.bundle.js'),
  typescript: workerUrl('ts.worker.bundle.js'),
  javascript: workerUrl('ts.worker.bundle.js'),
  json: workerUrl('json.worker.bundle.js'),
  css: workerUrl('css.worker.bundle.js'),
  scss: workerUrl('css.worker.bundle.js'),
  less: workerUrl('css.worker.bundle.js'),
  html: workerUrl('html.worker.bundle.js'),
  handlebars: workerUrl('html.worker.bundle.js'),
  razor: workerUrl('html.worker.bundle.js'),
}

const buildWorkerBundle = (worker: WorkerEntry): Uint8Array => {
  const outfile = resolve(CACHE_DIR, worker.filename)
  if (!existsSync(outfile)) {
    mkdirSync(CACHE_DIR, { recursive: true })
    const entryPoint = resolve(WEBSITE_ROOT, 'node_modules', worker.entry)
    buildSync({
      entryPoints: [entryPoint],
      bundle: true,
      outfile,
      format: 'iife',
      target: 'es2022',
    })
  }
  return readFileSync(outfile)
}

const MONACO_ENVIRONMENT_SCRIPT = `<script>
  globalThis.MonacoEnvironment = {
    getWorkerUrl(_moduleId, label) {
      const map = ${JSON.stringify(labelToWorkerUrl)};
      return map[label] ?? map.editorWorkerService;
    },
  };
</script>`

export const monacoWorkersPlugin = (): Plugin => ({
  name: 'monaco-workers',
  configureServer(server) {
    for (const worker of WORKERS) {
      server.middlewares.use(
        `${PUBLIC_PATH}/${worker.filename}`,
        (_request, response) => {
          const contents = buildWorkerBundle(worker)
          response.setHeader('Content-Type', 'text/javascript')
          response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
          response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
          response.end(contents)
        },
      )
    }
  },
  buildStart() {
    // NOTE: Only emit during a real build, not when the plugin is
    // loaded inside `vite dev`'s scan phase. `emitFile` outside of a
    // build is a no-op.
    if (this.environment.mode !== 'build') {
      return
    }
    for (const worker of WORKERS) {
      const contents = buildWorkerBundle(worker)
      this.emitFile({
        type: 'asset',
        fileName: `monacoworkers/${worker.filename}`,
        source: contents,
      })
    }
  },
  transformIndexHtml(html) {
    return html.replace('</head>', `${MONACO_ENVIRONMENT_SCRIPT}\n</head>`)
  },
})
