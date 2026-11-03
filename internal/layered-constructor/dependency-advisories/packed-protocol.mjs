import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const serverPath = resolve('node_modules/@foldkit/devtools-mcp/dist/server.js')
const client = new Client({
  name: 'FoldkitPackedDependencyCheck',
  version: '1.0.0',
})
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: process.cwd(),
  stderr: 'pipe',
})

try {
  await client.connect(transport)
  await client.ping()
  const result = await client.listTools()
  assert(result.tools.some(tool => tool.name === 'foldkit_resume'))
  console.log(
    `Packed MCP initialization, ping and ${result.tools.length} tools passed`,
  )
} finally {
  await client.close()
}

const scaffold = JSON.parse(
  readFileSync('node_modules/create-foldkit-app/package.json', 'utf8'),
)
assert.equal(scaffold.dependencies.rimraf, undefined)

const help = spawnSync(
  process.execPath,
  [resolve('node_modules/create-foldkit-app/dist/index.js'), '--help'],
  { encoding: 'utf8', timeout: 30_000 },
)
assert.equal(help.status, 0, help.stderr)
assert.match(help.stdout, /Create a new Foldkit application/)
console.log(
  'Packed scaffold CLI help passed without a runtime rimraf dependency',
)
