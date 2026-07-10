import { Html, html } from 'foldkit/html'
import { effectVersion } from 'virtual:landing-data'

import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
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
  elmComparisonRouter,
  examplesRouter,
  toolingLintingRouter,
} from '../route'
import { type CopiedSnippets, codeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const CREATE_FOLDKIT_APP_COMMAND = 'npx create-foldkit-app@latest'
const MANUAL_INSTALL_COMMAND = `npm install foldkit effect@${effectVersion} @effect/platform-browser@${effectVersion}`
const DEV_PNPM = 'pnpm dev'
const DEV_NPM = 'npm run dev'
const DEV_YARN = 'yarn dev'
const DEV_BUN = 'bun dev'

const requirementsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'requirements',
  text: 'Requirements',
}

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
  requirementsHeader,
  quickStartHeader,
  projectStructureHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('getting-started', 'Getting Started'),
      para(
        'Built on Effect. Architected like Elm. Written in TypeScript. Let’s get your first application running.',
      ),
      infoCallout(
        'New to Foldkit?',
        'If you’d like to learn about Foldkit’s architecture before starting a project, head to ',
        link(coreArchitectureRouter(), 'Architecture'),
        '.',
      ),
      tableOfContentsEntryToHeader(requirementsHeader),
      para(
        inlineCode('create-foldkit-app'),
        ' requires Node.js 22.22.2 or newer.',
      ),
      para(
        'Foldkit is built on the Effect v4 beta and pins its peer dependencies to an exact version: ',
        inlineCode(`effect@${effectVersion}`),
        ' and ',
        inlineCode(`@effect/platform-browser@${effectVersion}`),
        '. Stable Effect v3 does not satisfy the pin, so adding Foldkit to a project that already uses Effect v3 will produce peer dependency conflicts, and upgrading Foldkit can require upgrading the Effect beta in lockstep. Projects scaffolded with ',
        inlineCode('create-foldkit-app'),
        ' get the correct versions automatically.',
      ),
      para(
        'To add Foldkit to an existing project instead of scaffolding a new one, install it together with its pinned peer dependencies:',
      ),
      codeBlock(
        MANUAL_INSTALL_COMMAND,
        'Copy manual install command',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(quickStartHeader),
      para(
        link(Link.createFoldkitApp, 'Create Foldkit app'),
        ' is the recommended way to get started. You’ll select an ',
        link(examplesRouter(), 'example'),
        ' to start with and the package manager you’d like to use.',
      ),
      codeBlock(
        CREATE_FOLDKIT_APP_COMMAND,
        'Copy command to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Once the project is created, navigate to the project directory and start the dev server. Each command below is the same step for a different package manager, so pick the one you use:',
      ),
      h.div(
        [h.Class('flex gap-2 flex-wrap mb-8')],
        [
          h.div(
            [h.DataAttribute('llm-label', 'pnpm')],
            [codeBlock(DEV_PNPM, 'Copy pnpm command', copiedSnippets)],
          ),
          h.div(
            [h.DataAttribute('llm-label', 'npm')],
            [codeBlock(DEV_NPM, 'Copy npm command', copiedSnippets)],
          ),
          h.div(
            [h.DataAttribute('llm-label', 'yarn')],
            [codeBlock(DEV_YARN, 'Copy yarn command', copiedSnippets)],
          ),
          h.div(
            [h.DataAttribute('llm-label', 'bun')],
            [codeBlock(DEV_BUN, 'Copy bun command', copiedSnippets)],
          ),
        ],
      ),
      infoCallout(
        'Coming from React or Elm?',
        'If you know React, the ',
        link(comingFromReactRouter(), 'Coming from React'),
        ' guide maps your existing knowledge onto Foldkit. If you know Elm, see ',
        link(elmComparisonRouter(), 'Foldkit vs Elm: Side by Side'),
        '.',
      ),
      tableOfContentsEntryToHeader(projectStructureHeader),
      para('A new Foldkit project has the following structure:'),
      comparisonTable(
        ['File', 'Description'],
        [
          [[inlineCode('src/main.ts')], ['Your application code']],
          [
            [inlineCode('src/entry.ts')],
            ['Runtime bootstrap, referenced from index.html'],
          ],
          [[inlineCode('src/styles.css')], ['Tailwind CSS entry point']],
          [[inlineCode('index.html')], ['HTML entry point']],
          [
            [inlineCode('vite.config.ts')],
            ['Vite configuration with Foldkit HMR plugin'],
          ],
          [[inlineCode('tsconfig.json')], ['TypeScript configuration']],
          [[inlineCode('.oxlintrc.json')], ['Oxlint configuration']],
          [[inlineCode('.prettierrc')], ['Prettier configuration']],
          [[inlineCode('AGENTS.md')], ['AI coding assistant conventions']],
        ],
      ),
      para(
        'The generated project includes ',
        inlineCode('pnpm lint'),
        ' and ',
        inlineCode('pnpm format'),
        '. See ',
        link(toolingLintingRouter(), 'Oxlint Plugin'),
        ' for the Foldkit-specific oxlint rules.',
      ),
      para(
        inlineCode('src/main.ts'),
        ' holds the pure definitions for your application: Model, Messages, update, init, and view. ',
        inlineCode('src/entry.ts'),
        ' imports them and boots the runtime with ',
        inlineCode('Runtime.makeApplication'),
        ' and ',
        inlineCode('Runtime.run'),
        '. Some starter examples keep ',
        inlineCode('main.ts'),
        ' in one file, while others split the Model, Messages, update, and view into separate modules.',
      ),
      para(
        'When you’re ready to dig in, head to ',
        link(coreArchitectureRouter(), 'Architecture'),
        ' to understand how the pieces fit together.',
      ),
      infoCallout(
        'Using AI?',
        'Foldkit’s architecture makes AI-assisted development uniquely effective. See ',
        link(aiOverviewRouter(), 'AI'),
        ' for setup.',
      ),
    ],
  )
}
