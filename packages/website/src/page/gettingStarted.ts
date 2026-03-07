import { Html } from 'foldkit/html'

import { Class, div, li, ul } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  comingFromReactRouter,
  coreCounterExampleRouter,
} from '../route'
import { codeBlock } from '../view/codeBlock'

const CREATE_FOLDKIT_APP_COMMAND =
  'npx create-foldkit-app@latest --wizard'
const DEV_PNPM = 'pnpm dev'
const DEV_NPM = 'npm run dev'
const DEV_YARN = 'yarn dev'

const quickStartHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'quick-start',
  text: 'Quick Start',
}

const projectStructureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'project-structure',
  text: 'Project Structure',
}

const nextStepsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'next-steps',
  text: 'Next Steps',
}

const aiAssistedHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'ai-assisted',
  text: 'AI-Assisted Development',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  quickStartHeader,
  projectStructureHeader,
  nextStepsHeader,
  aiAssistedHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('getting-started', 'Getting Started'),
      tableOfContentsEntryToHeader(quickStartHeader),
      para(
        link(Link.createFoldkitApp, 'Create Foldkit app'),
        " is the recommended way to get started with Foldkit. You'll be able to select the ",
        link(Link.foldkitExamples, 'example'),
        " you would like to start with and the package manager you'd like to use.",
      ),
      codeBlock(
        CREATE_FOLDKIT_APP_COMMAND,
        'Copy command to clipboard',
        model,
        'mb-8',
      ),
      para(
        'Once the project is created, navigate to the project directory and start the dev server:',
      ),
      div(
        [Class('flex gap-2 flex-wrap mb-8')],
        [
          codeBlock(DEV_PNPM, 'Copy pnpm command', model),
          codeBlock(DEV_NPM, 'Copy npm command', model),
          codeBlock(DEV_YARN, 'Copy yarn command', model),
        ],
      ),
      callout(
        'Coming from React?',
        "If you're familiar with React, check out the ",
        link(comingFromReactRouter(), 'Coming from React'),
        ' guide to understand how your existing knowledge applies.',
      ),
      tableOfContentsEntryToHeader(projectStructureHeader),
      para('A new Foldkit project has the following structure:'),
      ul(
        [Class('list-none mb-6 space-y-2 font-mono text-sm')],
        [
          li(
            [],
            [inlineCode('src/main.ts'), ' — Your application code'],
          ),
          li([], [inlineCode('index.html'), ' — HTML entry point']),
          li(
            [],
            [
              inlineCode('vite.config.ts'),
              ' — Vite configuration with Foldkit HMR plugin',
            ],
          ),
          li(
            [],
            [
              inlineCode('tsconfig.json'),
              ' — TypeScript configuration',
            ],
          ),
          li(
            [],
            [
              inlineCode('package.json'),
              ' — Dependencies and scripts',
            ],
          ),
        ],
      ),
      para(
        'The ',
        inlineCode('src/main.ts'),
        ' file is the entry point for your application. In the starter examples, it contains the Model, Messages, Update function, and View all in one file. As your app grows, you can split these into separate modules.',
      ),
      tableOfContentsEntryToHeader(nextStepsHeader),
      para(
        'Now that you have a running app, head to the ',
        link(coreCounterExampleRouter(), 'Counter Example'),
        ' page to understand how the pieces fit together.',
      ),
      tableOfContentsEntryToHeader(aiAssistedHeader),
      para(
        "Foldkit's explicit architecture — state in the Model, events as Messages, logic in pure functions — works well with AI coding assistants like Claude Code. The patterns are predictable, so the AI can follow and extend them reliably.",
      ),
      para(
        'For the best experience, clone the ',
        link(Link.github, 'Foldkit repository'),
        ' as a git submodule in your project:',
      ),
      codeBlock(
        'git submodule add https://github.com/devinjameson/foldkit.git',
        'Copy submodule command',
        model,
        'mb-4',
      ),
      para('To update the submodule when Foldkit changes:'),
      codeBlock(
        'git submodule update --remote foldkit',
        'Copy update command',
        model,
        'mb-4',
      ),
      para(
        'The starter template includes a ',
        inlineCode('.ignore'),
        ' file that keeps the ',
        inlineCode('foldkit/'),
        " submodule out of your editor's file search and file tree.",
      ),
      para(
        'It also includes a ',
        inlineCode('AGENTS.md'),
        ' with Foldkit conventions. The submodule gives the AI access to the ',
        link(Link.foldkitSource, 'Foldkit source code'),
        ', the ',
        link(Link.foldkitExamples, 'examples'),
        ', ',
        link(Link.typingTerminal, 'Typing Terminal'),
        ' (',
        link(Link.typingTerminalSource, 'source'),
        ')',
        ', and ',
        link(Link.websiteSource, 'this documentation site'),
        ' — real patterns it can learn from and apply to your code.',
      ),
    ],
  )
