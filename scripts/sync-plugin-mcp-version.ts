import { readFileSync, writeFileSync } from 'node:fs'

const MCP_CONFIG_PATH = '.mcp.json'
const DEVTOOLS_MCP_PACKAGE_JSON_PATH = 'packages/devtools-mcp/package.json'
const SERVER_NAME = 'foldkit-devtools'
const PACKAGE_NAME = '@foldkit/devtools-mcp'
const PINNED_SPEC_PREFIX = `${PACKAGE_NAME}@`

type McpServerEntry = {
  command?: string
  args?: Array<string>
}

const packageJson = JSON.parse(
  readFileSync(DEVTOOLS_MCP_PACKAGE_JSON_PATH, 'utf8'),
) as { version: string }
const pinnedSpec = `${PINNED_SPEC_PREFIX}${packageJson.version}`

const mcpConfig = JSON.parse(readFileSync(MCP_CONFIG_PATH, 'utf8')) as {
  mcpServers?: Record<string, McpServerEntry>
}
const server = mcpConfig.mcpServers?.[SERVER_NAME]

if (server === undefined || server.args === undefined) {
  console.error(
    `ERROR: ${MCP_CONFIG_PATH} has no "${SERVER_NAME}" npx entry to sync.`,
  )
  process.exit(1)
}

const hasSpec = server.args.some(
  arg => arg === PACKAGE_NAME || arg.startsWith(PINNED_SPEC_PREFIX),
)

if (!hasSpec) {
  console.error(
    `ERROR: ${MCP_CONFIG_PATH} "${SERVER_NAME}" args do not reference ${PACKAGE_NAME}.`,
  )
  process.exit(1)
}

const nextArgs = server.args.map(arg =>
  arg === PACKAGE_NAME || arg.startsWith(PINNED_SPEC_PREFIX) ? pinnedSpec : arg,
)

if (JSON.stringify(nextArgs) === JSON.stringify(server.args)) {
  console.log(`Plugin MCP pin already at ${pinnedSpec}.`)
  process.exit(0)
}

const nextConfig = {
  ...mcpConfig,
  mcpServers: {
    ...mcpConfig.mcpServers,
    [SERVER_NAME]: { ...server, args: nextArgs },
  },
}

writeFileSync(MCP_CONFIG_PATH, `${JSON.stringify(nextConfig, null, 2)}\n`)
console.log(`Synced plugin MCP pin to ${pinnedSpec}.`)
