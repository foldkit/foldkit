import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MCP_SERVER_NAME = 'foldkit-devtools'
const DEFAULT_MCP_FILE_NAME = '.mcp.json'

const SERVER_ENTRY = {
  command: 'npx',
  args: ['-y', '@foldkit/devtools-mcp'],
}

type McpConfig = Readonly<{
  mcpServers?: Record<string, unknown>
}> &
  Record<string, unknown>

const loadExistingConfig = (mcpPath: string): McpConfig => {
  if (!existsSync(mcpPath)) {
    return {}
  }
  try {
    const raw = readFileSync(mcpPath, 'utf-8')
    const parsed = JSON.parse(raw) as McpConfig
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('config root is not an object')
    }
    return parsed
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[foldkit-devtools-mcp] failed to parse existing ${mcpPath}: ${message}`,
    )
    console.error(
      '[foldkit-devtools-mcp] aborting init to avoid clobbering your config. Fix the JSON and re-run.',
    )
    process.exit(1)
  }
}

const printNextSteps = (alreadyRegistered: boolean): void => {
  console.log('')
  if (alreadyRegistered) {
    console.log('Updated existing foldkit-devtools entry.')
  } else {
    console.log('Added foldkit-devtools to .mcp.json.')
  }
  console.log('')
  console.log('Next steps:')
  console.log('')
  console.log(
    '  1. Add devToolsMcpPort to your Vite plugin call in vite.config.ts:',
  )
  console.log('')
  console.log('       plugins: [foldkit({ devToolsMcpPort: 9988 })]')
  console.log('')
  console.log(
    '  2. Pass your Message Schema to Runtime.makeProgram (enables dispatch):',
  )
  console.log('')
  console.log('       devTools: { Message }')
  console.log('')
  console.log(
    '  3. Restart your dev server, then restart your AI agent (Claude Code, Cursor, etc.).',
  )
  console.log('')
  console.log(
    'Tools will appear under the foldkit-devtools server, e.g. foldkit_get_model, foldkit_dispatch_message.',
  )
}

/**
 * Initialize the Foldkit DevTools MCP server in the current working directory.
 * Writes (or merges into) `.mcp.json` so any AI agent that respects the file
 * picks up the server. Idempotent: re-running overwrites only the
 * `foldkit-devtools` entry, leaving any other configured servers alone.
 */
export const runInit = (): void => {
  const cwd = process.cwd()
  const mcpPath = join(cwd, DEFAULT_MCP_FILE_NAME)

  const existing = loadExistingConfig(mcpPath)
  const existingServers = (existing.mcpServers ?? {}) as Record<string, unknown>
  const alreadyRegistered = MCP_SERVER_NAME in existingServers

  const next: McpConfig = {
    ...existing,
    mcpServers: {
      ...existingServers,
      [MCP_SERVER_NAME]: SERVER_ENTRY,
    },
  }

  writeFileSync(mcpPath, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
  printNextSteps(alreadyRegistered)
}
