import type { Html } from 'foldkit/html'

import { div } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  aiMcpRouter,
  aiSkillsRouter,
  patternsOutMessageRouter,
  patternsSubmodelsRouter,
} from '../route'
import { type CopiedSnippets, codeBlock } from '../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const submoduleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'submodule-setup',
  text: 'Submodule Setup',
}

const skillsPluginHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'skills-plugin',
  text: 'Skills Plugin',
}

const devToolsMcpHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'devtools-mcp',
  text: 'DevTools MCP',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  submoduleHeader,
  skillsPluginHeader,
  devToolsMcpHeader,
]

const SUBMODULE_COMMAND =
  'git submodule add https://github.com/foldkit/foldkit.git repos/foldkit'

const UPDATE_COMMAND = 'git submodule update --remote repos/foldkit'

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('ai/overview', 'AI'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Most frameworks give AI tools too much freedom. State can live anywhere, effects can happen anywhere, and there\u2019s no canonical structure to follow. The result is generated code that works but doesn\u2019t hold up.',
      ),
      para(
        'Foldkit\u2019s architecture changes this. The Elm Architecture enforces a rigid, yet expressive structure (Message \u2192 update \u2192 Model \u2192 view \u2192 Command) where every piece has a canonical shape and place. Side effects are encapsulated in exactly six places: Commands, Mount Effects, flags, Subscription streams, Resources, and ManagedResources. Every Message routes back through update. The same constraints that make your code correct make it machine-legible.',
      ),
      para(
        'An AI that understands this loop can reason about the entire program as a state machine. It can generate structurally valid code, not just syntactically valid code. It can scaffold Messages and know exactly where they wire through. It can extract ',
        link(patternsSubmodelsRouter(), 'Submodels'),
        ' and get the ',
        link(patternsOutMessageRouter(), 'OutMessage'),
        ' pattern right.',
      ),
      para(
        'This isn\u2019t a bolt-on. It\u2019s a consequence of the architecture.',
      ),
      tableOfContentsEntryToHeader(submoduleHeader),
      para(
        'For the best experience, clone the Foldkit repository as a git submodule in your project:',
      ),
      codeBlock(
        SUBMODULE_COMMAND,
        'Copy submodule command',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'This gives the AI access to the Foldkit source code, the examples, and this documentation site: real patterns it can learn from and apply to your code. The starter template includes an ',
        inlineCode('AGENTS.md'),
        ' with Foldkit conventions and a ',
        inlineCode('.ignore'),
        ' file that keeps the submodule out of your editor\u2019s file tree.',
      ),
      para(
        'To update the submodule and pull the latest source, examples, and docs:',
      ),
      codeBlock(UPDATE_COMMAND, 'Copy update command', copiedSnippets, 'mb-4'),
      tableOfContentsEntryToHeader(skillsPluginHeader),
      para(
        'Foldkit ships a ',
        link(aiSkillsRouter(), 'skills plugin'),
        ' for Claude Code that encodes Foldkit\u2019s conventions, patterns, and quality standards into agent workflows. The skills reference the actual example code in the Foldkit repository, so the generated output stays in sync with the framework as it evolves.',
      ),
      tableOfContentsEntryToHeader(devToolsMcpHeader),
      para(
        'Skills generate code. The ',
        link(aiMcpRouter(), 'DevTools MCP server'),
        ' lets agents observe and interact with code that\u2019s already running. Agents can read the current Model, list and inspect Message history, rewind the UI to any past Model, and dispatch Messages into the runtime.',
      ),
    ],
  )
