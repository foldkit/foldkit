import { readFileSync } from 'node:fs'

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
const packageVersion = packageJson.version

const mcpConfig = JSON.parse(readFileSync(MCP_CONFIG_PATH, 'utf8')) as {
  mcpServers?: Record<string, McpServerEntry>
}
const server = mcpConfig.mcpServers?.[SERVER_NAME]

if (server === undefined) {
  console.error(
    `ERROR: ${MCP_CONFIG_PATH} has no "${SERVER_NAME}" server entry.`,
  )
  process.exit(1)
}

if (server.command !== 'npx') {
  console.error(
    `ERROR: ${MCP_CONFIG_PATH} "${SERVER_NAME}" must launch through npx so plugin installs`,
  )
  console.error(
    `resolve the published package. Found command "${server.command}".`,
  )
  process.exit(1)
}

const spec = (server.args ?? []).find(arg => arg.startsWith(PACKAGE_NAME))

if (spec === undefined) {
  console.error(
    `ERROR: ${MCP_CONFIG_PATH} "${SERVER_NAME}" npx args do not reference ${PACKAGE_NAME}.`,
  )
  process.exit(1)
}

if (!spec.startsWith(PINNED_SPEC_PREFIX) || spec === PINNED_SPEC_PREFIX) {
  console.error(
    `ERROR: ${MCP_CONFIG_PATH} "${SERVER_NAME}" must pin a version, like ${PINNED_SPEC_PREFIX}${packageVersion}.`,
  )
  console.error(`Found "${spec}".`)
  process.exit(1)
}

const pinnedVersion = spec.slice(PINNED_SPEC_PREFIX.length)

if (pinnedVersion !== packageVersion) {
  console.error(
    `ERROR: ${MCP_CONFIG_PATH} pins ${PACKAGE_NAME}@${pinnedVersion} but ${DEVTOOLS_MCP_PACKAGE_JSON_PATH} is at ${packageVersion}.`,
  )
  console.error(
    'Run "tsx scripts/sync-plugin-mcp-version.ts" to update the pin.',
  )
  process.exit(1)
}

console.log(`Plugin MCP pin matches ${PACKAGE_NAME}@${packageVersion}.`)
