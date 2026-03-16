import type { Html } from 'foldkit/html'

import { div } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { type CopiedSnippets, codeBlock } from '../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const availableSkillsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'available-skills',
  text: 'Available Skills',
}

const generateProgramHeader: TableOfContentsEntry = {
  level: 'h4',
  id: 'generate-program',
  text: 'generate-program',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  availableSkillsHeader,
  generateProgramHeader,
]

const INSTALL_COMMAND = '/plugin install foldkit/foldkit'
const GENERATE_PROGRAM_COMMAND = '/foldkit-skills:generate-program'

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('ai/skills', 'Skills'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit ships a ',
        inlineCode('foldkit-skills'),
        ' plugin for ',
        inlineCode('Claude Code'),
        ' that provides agent skills tailored to the Foldkit architecture. These skills encode the conventions, patterns, and quality standards that make Foldkit apps well-factored and maintainable.',
      ),
      para('To install, run this command in the Claude Code prompt:'),
      codeBlock(
        INSTALL_COMMAND,
        'Copy install command',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(availableSkillsHeader),
      tableOfContentsEntryToHeader(generateProgramHeader),
      codeBlock(
        GENERATE_PROGRAM_COMMAND,
        'Copy generate-program command',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Generate a complete, idiomatic Foldkit application from a natural language description. Produces correct-by-construction apps with proper Model schemas, Message naming, Commands with error handling, and Foldkit UI component integration.',
      ),
      para(
        'More skills are in development \u2014 including message scaffolding, submodel extraction, and architecture auditing.',
      ),
    ],
  )
