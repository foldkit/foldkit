import { Html, html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { aiMcpRouter, aiSkillsRouter, coreSubmodelRouter } from '../route'
import { type CopiedSnippets, codeBlock } from '../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const subtreeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'subtree-setup',
  text: 'Subtree Setup',
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
  subtreeHeader,
  skillsPluginHeader,
  devToolsMcpHeader,
]

const SUBTREE_ADD_COMMAND =
  'git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash'

const SUBTREE_UPDATE_COMMAND =
  'git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash'

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('ai/overview', 'AI'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Most frameworks give AI tools too much freedom. State can live anywhere, effects can happen anywhere, and there’s no canonical structure to follow. The result is generated code that works but doesn’t hold up.',
      ),
      para(
        'Foldkit’s architecture changes this. The Elm Architecture enforces a rigid, yet expressive structure where every piece has a canonical shape and function. Side effects are encapsulated in exactly six places: Commands, Mount Effects, flags, Subscription streams, Resources, and ManagedResources. Every Message routes back through update. The same constraints that make your code correct make it machine-legible.',
      ),
      para(
        'An AI that understands this loop can reason about the entire program as a state machine. It can generate structurally valid code, not just syntactically valid code. It can scaffold Messages and know exactly where they wire through. It can extract ',
        link(coreSubmodelRouter(), 'Submodel'),
        ' and get the ',
        link(`${coreSubmodelRouter()}#surfacing-facts`, 'OutMessage'),
        ' pattern right.',
      ),
      para('This isn’t a bolt-on. It’s a consequence of the architecture.'),
      tableOfContentsEntryToHeader(subtreeHeader),
      para(
        'For the best experience, vendor the Foldkit repository into your project as a git subtree:',
      ),
      codeBlock(
        SUBTREE_ADD_COMMAND,
        'Copy subtree add command',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'This gives the AI access to the Foldkit source code, the examples, and this documentation site: real patterns it can learn from and apply to your code. Unlike a submodule, a subtree is checked into your repository, so a fresh clone (your teammate, a CI runner, a cloud agent) has the source on disk immediately. The starter template includes an ',
        inlineCode('AGENTS.md'),
        ' with Foldkit conventions and a ',
        inlineCode('.ignore'),
        ' file that keeps the vendored source out of your editor’s file tree.',
      ),
      para('To pull the latest source, examples, and docs into the subtree:'),
      codeBlock(
        SUBTREE_UPDATE_COMMAND,
        'Copy subtree update command',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(skillsPluginHeader),
      para(
        'Foldkit ships a ',
        link(aiSkillsRouter(), 'skills plugin'),
        ' for Claude Code that encodes Foldkit’s conventions, patterns, and quality standards into agent workflows. The skills reference the actual example code in the Foldkit repository, so the generated output stays in sync with the framework as it evolves.',
      ),
      tableOfContentsEntryToHeader(devToolsMcpHeader),
      para(
        'Skills generate code. The ',
        link(aiMcpRouter(), 'DevTools MCP server'),
        ' lets agents observe and interact with code that’s already running. Agents can read the current Model, list and inspect Message history, rewind the UI to any past Model, and dispatch Messages into the runtime.',
      ),
    ],
  )
}
