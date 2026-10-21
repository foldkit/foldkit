// Attribution-only probe for foldkit#1737. Not the official benchmark.
// One fresh native LSP per invocation. Opens one file in memory with an
// appended `const __codexProbe = <expr>.` line, requests cold completion,
// appends a newline (new program), and requests post-edit completion.
// Reuses the official memory-guard.py (3 GiB RSS / 4 GiB footprint, owned PID)
// and the official 18 s request / 22 s lifetime limits. Writes nothing to the
// workspace; output is a JSON line on stdout.
import { spawn } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath, pathToFileURL } from 'node:url'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((pairs, value, index, all) => (index % 2 === 0 ? [...pairs, [value.replace(/^--/, ''), all[index + 1]]] : pairs), []),
)
const workspace = realpathSync(args.workspace)
const file = join(workspace, args.file)
const expr = args.expr
const extraImport = args.import ? args.import + '\n' : ''
const mode = args.mode ?? 'completion'
const guardPath = join(dirname(fileURLToPath(import.meta.url)), 'memory-guard.py')
for (const name of ['GOMEMLIMIT', 'GOGC']) if (process.env[name] !== undefined) throw new Error(`${name} must be unset`)

const manifestPath = realpathSync(join(workspace, 'packages/foldkit/node_modules/typescript/package.json'))
const requireCompiler = createRequire(manifestPath)
const { default: getExePath } = await import(pathToFileURL(realpathSync(requireCompiler.resolve('#getExePath'))).href)
const executable = realpathSync(getExePath())
const { createMessageConnection, StreamMessageReader, StreamMessageWriter } = await import(
  pathToFileURL(realpathSync(requireCompiler.resolve('#vscode-jsonrpc/node'))).href
)
const compilerVersion = JSON.parse(readFileSync(manifestPath, 'utf8')).version

const original = readFileSync(file, 'utf8')
let text = extraImport + original + `\nconst __codexProbe = ${expr}${mode === 'completion' ? '.' : ''}\n`
let version = 1
const uri = pathToFileURL(file).href
const marker = `const __codexProbe = ${expr}`
const offset = text.lastIndexOf(marker) + marker.length + (mode === 'completion' ? 1 : -1)
const before = text.slice(0, offset).split('\n')
const position = { line: before.length - 1, character: before.at(-1).length }

const result = { file: args.file, expr, mode, compilerVersion, executable, measurements: [], maxRssMiB: 0 }
const child = spawn(executable, ['--lsp', '--stdio'], { cwd: workspace, env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'] })
let exited = false
let aborted
const exit = new Promise(resolve => child.once('close', () => { exited = true; resolve() }))
const kill = reason => { aborted ??= reason; if (!exited) child.kill('SIGKILL') }
const wall = setTimeout(() => kill('22-second process wall limit'), 22000)
const monitor = spawn('python3', ['-B', guardPath, String(child.pid), '27'], { stdio: ['ignore', 'pipe', 'pipe'] })
let buffer = ''
monitor.stdout.on('data', data => {
  buffer += data.toString()
  const lines = buffer.split('\n')
  buffer = lines.pop()
  for (const line of lines) {
    if (!line) continue
    const row = JSON.parse(line)
    if (row.rssBytes) result.maxRssMiB = Math.max(result.maxRssMiB, row.rssBytes / 1024 ** 2)
    if (row.killed || row.error) kill(row.reason ?? row.error)
  }
})
child.stderr.on('data', () => {})
const connection = createMessageConnection(new StreamMessageReader(child.stdout), new StreamMessageWriter(child.stdin))
connection.onRequest((method, params) => {
  if (method === 'workspace/configuration') return (params?.items ?? []).map(() => null)
  if (method === 'workspace/workspaceFolders') return [{ uri: pathToFileURL(workspace).href, name: 'probe' }]
  return null
})
connection.onNotification('textDocument/publishDiagnostics', () => {})
connection.onError(() => {})
connection.listen()
const request = async (label, method, params) => {
  const from = performance.now()
  let timer
  try {
    const value = await Promise.race([
      connection.sendRequest(method, params),
      new Promise((_, reject) => { timer = setTimeout(() => { kill(`${label}: 18000ms request timeout`); reject(new Error(aborted)) }, 18000) }),
      exit.then(() => { throw new Error(aborted ?? 'Server exited') }),
    ])
    const items = Array.isArray(value) ? value : value?.items
    result.measurements.push({ label, latencyMs: performance.now() - from, count: items?.length, hoverChars: value?.contents ? JSON.stringify(value.contents).length : undefined })
    return value
  } finally { clearTimeout(timer) }
}
try {
  await request('initialize', 'initialize', {
    processId: process.pid, rootUri: pathToFileURL(workspace).href,
    capabilities: { general: { positionEncodings: ['utf-16'] }, workspace: { configuration: true, workspaceFolders: true }, textDocument: { completion: { completionItem: { snippetSupport: true } }, hover: { contentFormat: ['markdown', 'plaintext'] }, diagnostic: { dynamicRegistration: true }, publishDiagnostics: { versionSupport: true } } },
    workspaceFolders: [{ uri: pathToFileURL(workspace).href, name: 'probe' }],
  })
  await connection.sendNotification('initialized', {})
  await connection.sendNotification('textDocument/didOpen', { textDocument: { uri, languageId: 'typescript', version, text } })
  const run = label =>
    mode === 'completion'
      ? request(label, 'textDocument/completion', { textDocument: { uri }, position, context: { triggerKind: 2, triggerCharacter: '.' } })
      : mode === 'hover'
        ? request(label, 'textDocument/hover', { textDocument: { uri }, position })
        : request(label, 'textDocument/diagnostic', { textDocument: { uri } })
  await run('cold')
  const lines = text.split('\n')
  const end = { line: lines.length - 1, character: lines.at(-1).length }
  text += '\n'
  version += 1
  await connection.sendNotification('textDocument/didChange', { textDocument: { uri, version }, contentChanges: [{ range: { start: end, end }, text: '\n' }] })
  const post = await run('post-edit')
  if (mode === 'diagnostics') result.errors = (post?.items ?? []).filter(item => item.severity === 1).map(item => `${item.code}:${item.range.start.line}:${item.message.slice(0, 160)}`)
  result.status = 'Passed'
} catch (error) {
  result.status = 'Failed'
  result.failure = String(error)
} finally {
  clearTimeout(wall)
  if (!exited) { child.kill('SIGTERM'); await Promise.race([exit, new Promise(r => setTimeout(r, 500))]); if (!exited) { child.kill('SIGKILL'); await exit } }
  monitor.kill('SIGTERM')
  connection.dispose()
  result.aborted = aborted
  console.log(JSON.stringify(result))
}
