import { Html } from 'foldkit/html'

import { Class, div } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  aiOverviewRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  examplesRouter,
} from '../route'
import { type CopiedSnippets, codeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const CREATE_FOLDKIT_APP_COMMAND = 'npx create-foldkit-app@latest'
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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  quickStartHeader,
  projectStructureHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('getting-started', 'Getting Started'),
      para(
        'Built on Effect. Architected like Elm. Written in TypeScript. Let\u2019s get your first application running.',
      ),
      infoCallout(
        'New to Foldkit?',
        'If you\u2019d like to learn about Foldkit\u2019s architecture before starting a project, head to ',
        link(coreArchitectureRouter(), 'Architecture and Concepts'),
        '.',
      ),
      tableOfContentsEntryToHeader(quickStartHeader),
      para(
        link(Link.createFoldkitApp, 'Create Foldkit app'),
        ' is the recommended way to get started. You\u2019ll select an ',
        link(examplesRouter(), 'example'),
        ' to start with and the package manager you\u2019d like to use.',
      ),
      codeBlock(
        CREATE_FOLDKIT_APP_COMMAND,
        'Copy command to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Once the project is created, navigate to the project directory and start the dev server:',
      ),
      div(
        [Class('flex gap-2 flex-wrap mb-8')],
        [
          codeBlock(DEV_PNPM, 'Copy pnpm command', copiedSnippets),
          codeBlock(DEV_NPM, 'Copy npm command', copiedSnippets),
          codeBlock(DEV_YARN, 'Copy yarn command', copiedSnippets),
        ],
      ),
      infoCallout(
        'Coming from React?',
        'If you\u2019re familiar with React, check out the ',
        link(comingFromReactRouter(), 'Coming from React'),
        ' guide to understand how your existing knowledge applies.',
      ),
      tableOfContentsEntryToHeader(projectStructureHeader),
      para('A new Foldkit project has the following structure:'),
      comparisonTable(
        ['File', 'Description'],
        [
          [[inlineCode('src/main.ts')], ['Your application code']],
          [[inlineCode('src/styles.css')], ['Tailwind CSS entry point']],
          [[inlineCode('index.html')], ['HTML entry point']],
          [
            [inlineCode('vite.config.ts')],
            ['Vite configuration with Foldkit HMR plugin'],
          ],
          [[inlineCode('tsconfig.json')], ['TypeScript configuration']],
          [[inlineCode('eslint.config.mjs')], ['ESLint configuration']],
          [[inlineCode('.prettierrc')], ['Prettier configuration']],
          [[inlineCode('AGENTS.md')], ['AI coding assistant conventions']],
        ],
      ),
      para(
        inlineCode('src/main.ts'),
        ' is the entry point for your application. Some starter examples keep everything in one file, while others split the Model, Messages, update, and view into separate modules.',
      ),
      para(
        'When you\u2019re ready to dig in, head to ',
        link(coreArchitectureRouter(), 'Architecture and Concepts'),
        ' to understand how the pieces fit together.',
      ),
      infoCallout(
        'Using AI?',
        'Foldkit\u2019s architecture makes AI-assisted development uniquely effective. See ',
        link(aiOverviewRouter(), 'AI'),
        ' for setup.',
      ),
    ],
  )
