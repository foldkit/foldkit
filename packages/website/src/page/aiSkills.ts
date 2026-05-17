import { Html, html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
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
  level: 'h2',
  id: 'available-skills',
  text: 'Available Skills',
}

const foldkitHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit',
  text: 'foldkit',
}

const generateProgramHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'generate-program',
  text: 'generate-program',
}

const auditProgramHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'audit-program',
  text: 'audit-program',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  availableSkillsHeader,
  foldkitHeader,
  generateProgramHeader,
  auditProgramHeader,
]

const ADD_MARKETPLACE_COMMAND = '/plugin marketplace add foldkit/foldkit'
const INSTALL_COMMAND = '/plugin install foldkit-skills@foldkit'
const FOLDKIT_COMMAND = '/foldkit-skills:foldkit'
const GENERATE_PROGRAM_COMMAND = '/foldkit-skills:generate-program'
const AUDIT_PROGRAM_COMMAND = '/foldkit-skills:audit-program'

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
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
      para(
        'To install, first add the Foldkit marketplace, then install the plugin:',
      ),
      codeBlock(
        ADD_MARKETPLACE_COMMAND,
        'Copy marketplace command',
        copiedSnippets,
        'mb-4',
      ),
      codeBlock(
        INSTALL_COMMAND,
        'Copy install command',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(availableSkillsHeader),
      tableOfContentsEntryToHeader(foldkitHeader),
      codeBlock(
        FOLDKIT_COMMAND,
        'Copy foldkit command',
        copiedSnippets,
        'mb-4',
      ),
      para(
        "Always-on framing for working in a Foldkit codebase. Auto-loads when Foldkit context is detected (imports, files, or prompt mentions) and sets the agent's posture: pattern-match against Foldkit's own apps (the examples, the website, the typing-game), treat the architecture as non-negotiable, use what the Foldkit and Effect stack already ships before reaching for outside libraries, and prefer the canonical source over memory. Points the agent at the vendored foldkit subtree for the conventions, source code, and examples themselves.",
      ),
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
      tableOfContentsEntryToHeader(auditProgramHeader),
      codeBlock(
        AUDIT_PROGRAM_COMMAND,
        'Copy audit-program command',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Audit an existing Foldkit program against the architecture, conventions, and quality bar. Surfaces structural issues, naming drift, accessibility gaps, dead code, and idiom violations as a structured BLOCKERS / QUALITY / NICE-TO-HAVE report. Read-only by default; fixes are opt-in and require explicit approval per item or batch.',
      ),
      para(
        'More skills are in development, including message scaffolding and Submodel extraction.',
      ),
    ],
  )
}
