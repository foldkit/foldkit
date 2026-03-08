import { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { patternsSubmodelsRouter } from '../route'
import * as Snippets from '../snippet'
import {
  type CopiedSnippets,
  codeBlock,
  highlightedCodeBlock,
} from '../view/codeBlock'

const startingSimpleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'starting-simple',
  text: 'Starting Simple',
}

const fileLayoutHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'file-layout',
  text: 'File Layout',
}

const domainModulesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'domain-modules',
  text: 'Domain Modules',
}

const indexReexportsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'index-reexports',
  text: 'Index Re-exports',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  startingSimpleHeader,
  fileLayoutHeader,
  domainModulesHeader,
  indexReexportsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('project-organization', 'Project Organization'),
      para(
        'Foldkit apps can start in a single ',
        inlineCode('main.ts'),
        " and split into modules as they grow. Here's how to organize your code as complexity increases.",
      ),
      tableOfContentsEntryToHeader(startingSimpleHeader),
      para(
        'The simplest Foldkit apps keep everything in ',
        inlineCode('main.ts'),
        ': Model, Messages, init, update, and view. The ',
        link(Link.exampleCounter, 'Counter example'),
        ' is a good reference.',
      ),
      para(
        "This is fine for small apps. You don't need to split into multiple files until the single file becomes hard to navigate.",
      ),
      tableOfContentsEntryToHeader(fileLayoutHeader),
      para(
        'As your app grows and you ',
        link(patternsSubmodelsRouter(), 'scale with Submodels'),
        ', a consistent file layout helps you navigate the codebase. Each page or feature becomes a folder:',
      ),
      codeBlock(
        Snippets.fileLayoutRaw,
        'Copy file layout to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Each page folder mirrors the Elm Architecture: Model defines state, Message defines events, update handles transitions, view renders HTML, and init sets up initial state.',
      ),
      para(
        'As pages grow, you can further split into subfolders. For example, the ',
        link(
          Link.typingTerminalRoomSource,
          'Typing Terminal room source',
        ),
        ' has ',
        inlineCode('view/'),
        ' and ',
        inlineCode('update/'),
        ' subfolders for its Room page.',
      ),
      tableOfContentsEntryToHeader(domainModulesHeader),
      para(
        'For business logic that spans multiple modules, create a ',
        inlineCode('domain/'),
        ' folder. Each file represents a domain concept with its schema and pure functions:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.domainModuleHighlighted),
          ],
          [],
        ),
        Snippets.domainModuleRaw,
        'Copy domain module to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This keeps related types and operations together. You can import the module and use ',
        inlineCode('Cart.addItem'),
        ', ',
        inlineCode('Cart.removeItem'),
        ', etc.',
      ),
      tableOfContentsEntryToHeader(indexReexportsHeader),
      para(
        'Use ',
        inlineCode('index.ts'),
        ' files to create clean namespace imports:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.indexReexportsHighlighted),
          ],
          [],
        ),
        Snippets.indexReexportsRaw,
        'Copy index re-exports to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para('Then import and use the namespace:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.indexUsageHighlighted),
          ],
          [],
        ),
        Snippets.indexUsageRaw,
        'Copy namespace usage to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This pattern gives you discoverability (',
        inlineCode('Home.'),
        ' shows everything available) while keeping imports clean.',
      ),
    ],
  )
