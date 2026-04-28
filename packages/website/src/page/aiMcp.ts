import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, table, tbody, td, th, thead, tr } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  aiOverviewRouter,
  coreDevToolsRouter,
  gettingStartedRouter,
} from '../route'
import * as Snippets from '../snippet'
import {
  type CopiedSnippets,
  codeBlock,
  highlightedCodeBlock,
} from '../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const setupHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'setup',
  text: 'Setup',
}

const toolsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'tools',
  text: 'Tools',
}

const howItWorksHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'how-it-works',
  text: 'How It Works',
}

const notesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'notes',
  text: 'Notes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  setupHeader,
  toolsHeader,
  howItWorksHeader,
  notesHeader,
]

const INIT_COMMAND = 'npx @foldkit/devtools-mcp init'
const INSTALL_COMMAND = 'npm install -D @foldkit/devtools-mcp'

const toolNameClassName =
  'font-mono text-sm text-gray-900 dark:text-gray-200 whitespace-nowrap'

const toolHeaderCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const toolNameCellClassName = 'py-2.5 pr-4 align-top'

const toolDescriptionCellClassName =
  'py-2.5 align-top text-gray-700 dark:text-gray-300'

type ToolRowSpec = Readonly<{
  name: string
  description: ReadonlyArray<string | Html>
}>

const tools: ReadonlyArray<ToolRowSpec> = [
  {
    name: 'foldkit_list_runtimes',
    description: [
      'Returns metadata for every connected browser tab. Agents call this first to discover which runtime to target.',
    ],
  },
  {
    name: 'foldkit_get_model',
    description: ['Snapshots the current Model.'],
  },
  {
    name: 'foldkit_get_init',
    description: [
      "Reads the recorded initial Model and the names of Commands returned from the application's ",
      inlineCode('init', 'text-xs'),
      ' function. Equivalent to selecting the synthetic ',
      inlineCode('init', 'text-xs'),
      ' row in the DevTools panel.',
    ],
  },
  {
    name: 'foldkit_get_runtime_state',
    description: [
      "Snapshots the runtime's DevTools state: history bounds, current paused/live status, and whether init is recorded. Useful for understanding what ",
      inlineCode('foldkit_list_messages', 'text-xs'),
      ' and ',
      inlineCode('foldkit_get_message', 'text-xs'),
      ' will see.',
    ],
  },
  {
    name: 'foldkit_list_messages',
    description: [
      'Lists recent Message history entries with pagination. Each entry carries the Message body, Command names triggered, timestamp, an ',
      inlineCode('isModelChanged', 'text-xs'),
      ' flag, the diff path lists, and any extracted Submodel chain.',
    ],
  },
  {
    name: 'foldkit_get_message',
    description: [
      'Reads one entry at a given index, including the Model before and after the Message was applied. Use ',
      inlineCode('foldkit_get_init', 'text-xs'),
      ' for the synthetic init entry at index ',
      inlineCode('-1', 'text-xs'),
      '.',
    ],
  },
  {
    name: 'foldkit_list_keyframes',
    description: [
      'Returns the indices Foldkit can replay back to. Index ',
      inlineCode('-1', 'text-xs'),
      ' is the initial Model.',
    ],
  },
  {
    name: 'foldkit_replay_to_keyframe',
    description: [
      'Time-travels the runtime to a previous state. The runtime is paused at that snapshot until ',
      inlineCode('foldkit_resume', 'text-xs'),
      ' is called.',
    ],
  },
  {
    name: 'foldkit_resume',
    description: ['Resumes normal execution after a replay.'],
  },
  {
    name: 'foldkit_dispatch_message',
    description: [
      'Enqueues a Message into the runtime as if your application produced it. The runtime decodes the payload against your Schema and returns a clean error if it does not match.',
    ],
  },
]

const toolRow = ({ name, description }: ToolRowSpec): Html =>
  tr(
    [Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      td(
        [Class(toolNameCellClassName)],
        [div([Class(toolNameClassName)], [name])],
      ),
      td([Class(toolDescriptionCellClassName)], description),
    ],
  )

const toolsTable: Html = div(
  [Class('mb-6')],
  [
    table(
      [Class('w-full text-sm')],
      [
        thead(
          [],
          [
            tr(
              [],
              [
                th([Class(toolHeaderCellClassName)], ['Tool']),
                th([Class(toolHeaderCellClassName)], ['Description']),
              ],
            ),
          ],
        ),
        tbody([], tools.map(toolRow)),
      ],
    ),
  ],
)

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('ai/mcp', 'DevTools MCP Server'),

      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit ships ',
        inlineCode('@foldkit/devtools-mcp'),
        ', an MCP server that exposes a running Foldkit app to AI agents. Agents can read the current Model, list and inspect Message history, rewind the UI to any past Model, and dispatch Messages into the runtime.',
      ),
      para(
        'It complements ',
        link(aiOverviewRouter(), 'agent skills'),
        '. Skills generate code; the MCP server lets agents observe and interact with code that’s already running.',
      ),
      para(
        'The MCP server pairs with ',
        link(coreDevToolsRouter(), 'DevTools'),
        '. DevTools shows Message history and Model snapshots in a panel for humans; the MCP server exposes the same data and controls to AI agents.',
      ),

      tableOfContentsEntryToHeader(setupHeader),
      para(
        'Projects scaffolded with ',
        link(gettingStartedRouter(), 'create-foldkit-app'),
        ' already ship with the MCP server pre-wired. Open the project in your AI agent and the tools appear under the ',
        inlineCode('foldkit-devtools'),
        ' server. Skip the rest of this section.',
      ),
      para(
        'For existing projects, run the init command in your project root. It writes a ',
        inlineCode('.mcp.json'),
        ' that any MCP-aware AI agent (Claude Code, Codex, Cursor, Windsurf) will pick up:',
      ),
      codeBlock(INIT_COMMAND, 'Copy init command', copiedSnippets, 'mb-4'),
      para(
        'For faster startup, install the MCP server as a devDependency. Otherwise ',
        inlineCode('npx'),
        ' fetches it on each AI agent restart:',
      ),
      codeBlock(
        INSTALL_COMMAND,
        'Copy install command',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'In ',
        inlineCode('vite.config.ts'),
        ', pass ',
        inlineCode('devToolsMcpPort'),
        ' to the Foldkit plugin so it opens the WebSocket relay:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.aiMcpViteConfigHighlighted)],
          [],
        ),
        Snippets.aiMcpViteConfigRaw,
        'Copy Vite config snippet',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'In your ',
        inlineCode('Runtime.makeProgram'),
        ' call, pass your ',
        inlineCode('Message'),
        ' Schema. The runtime decodes every dispatched Message against it before reaching your update function:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.aiMcpProgramConfigHighlighted)],
          [],
        ),
        Snippets.aiMcpProgramConfigRaw,
        'Copy program config snippet',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Restart your dev server, then restart your AI agent. The ',
        inlineCode('foldkit_*'),
        ' tools are now available under the ',
        inlineCode('foldkit-devtools'),
        ' server.',
      ),
      para(
        'The browser bridge runs inside your app, so the MCP server only sees a runtime while the app is open in a browser tab. Close the tab and the runtime disappears from ',
        inlineCode('foldkit_list_runtimes'),
        '.',
      ),

      tableOfContentsEntryToHeader(toolsHeader),
      para(
        'Each tool accepts an optional ',
        inlineCode('runtime_id'),
        '. When omitted, the most recently connected runtime is used.',
      ),
      toolsTable,

      tableOfContentsEntryToHeader(howItWorksHeader),
      para(
        'The browser bridge runs alongside DevTools in your app and subscribes to the DevTools store. The Vite plugin opens a WebSocket server on ',
        inlineCode('devToolsMcpPort'),
        ' and relays traffic between browsers and MCP clients. The MCP server runs as a Node child process spawned by your AI agent, connects to the relay, and exposes the typed tools.',
      ),
      para(
        'Multiple browser tabs can be connected at once and each is addressable by its connection id. When a tab closes (gracefully or not) the plugin prunes it from the live runtime list, so the agent’s default to most recently connected always points at a live tab.',
      ),
      para(
        'Messages flow as Effect Schema values end to end. Foldkit defines the wire protocol and every layer validates at its boundary. To dispatch, agents read your application source to learn the ',
        inlineCode('Message'),
        ' Schema and construct a payload; the runtime decodes it and returns a clean error if the shape does not match.',
      ),
      para(
        'When the dev server restarts, the MCP server’s WebSocket client reconnects automatically with exponential backoff. No agent restart required.',
      ),

      tableOfContentsEntryToHeader(notesHeader),
      para(
        'The MCP bridge shares its lifecycle with DevTools. The default enables both in dev. Setting ',
        inlineCode('devTools: false'),
        ' in your program config disables the bridge along with DevTools. The runtime becomes invisible to MCP.',
      ),
      para(
        'Without ',
        inlineCode('Message'),
        ' in your DevToolsConfig, dispatch is rejected. The other tools (read-only) work without it.',
      ),
      para(
        'The relay only runs at dev time. Production builds never include the relay or the bridge, regardless of any ',
        inlineCode('show'),
        ' setting.',
      ),
    ],
  )
