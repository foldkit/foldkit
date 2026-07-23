import { Html, html } from 'foldkit/html'

import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { aiOverviewRouter } from '../route'
import { type CopiedSnippets, codeBlock } from '../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const installationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'installation',
  text: 'Installation',
}

const claudeCodeHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'claude-code',
  text: 'Claude Code',
}

const codexHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'codex-and-chatgpt',
  text: 'Codex and ChatGPT',
}

const opencodeHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'opencode',
  text: 'OpenCode',
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
  installationHeader,
  claudeCodeHeader,
  codexHeader,
  opencodeHeader,
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
        ' plugin that provides agent skills tailored to the Foldkit architecture. These skills encode the conventions, patterns, and quality standards that make Foldkit apps well-factored and maintainable.',
      ),
      para(
        'The skills work with ',
        inlineCode('Claude Code'),
        ', ',
        inlineCode('Codex'),
        ', the ChatGPT desktop app, and ',
        inlineCode('OpenCode'),
        '. Each skill is a directory with a ',
        inlineCode('SKILL.md'),
        ' file, the format they all read.',
      ),
      tableOfContentsEntryToHeader(installationHeader),
      tableOfContentsEntryToHeader(claudeCodeHeader),
      para('Add the Foldkit marketplace, then install the plugin:'),
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
      tableOfContentsEntryToHeader(codexHeader),
      para(
        'Codex discovers repo-local skills from ',
        inlineCode('.agents/skills/'),
        '. Vendor the Foldkit repository as a git subtree (see the ',
        link(aiOverviewRouter(), 'AI overview'),
        ') so the sources are on disk, then copy or symlink the skill directories from ',
        inlineCode('repos/foldkit/skills/'),
        ' into ',
        inlineCode('.agents/skills/'),
        ' in your project. Invoke a skill by name, for example ',
        inlineCode('$generate-program'),
        '.',
      ),
      para(
        'The ChatGPT desktop app surfaces the skills in its picker from the ',
        inlineCode('agents/openai.yaml'),
        ' descriptor shipped alongside each ',
        inlineCode('SKILL.md'),
        ' (display name, short description, and default prompt). Follow the ',
        link(Link.chatgptSkills, 'ChatGPT skills guide'),
        ' to register them.',
      ),
      tableOfContentsEntryToHeader(opencodeHeader),
      para(
        link(Link.opencodeSkills, 'OpenCode'),
        ' discovers skills from ',
        inlineCode('.opencode/skills/'),
        ', ',
        inlineCode('.claude/skills/'),
        ', and ',
        inlineCode('.agents/skills/'),
        ', walking up from the working directory to the git root. It reads the ',
        inlineCode('SKILL.md'),
        ' frontmatter directly and ignores the ChatGPT ',
        inlineCode('agents/openai.yaml'),
        ' descriptor.',
      ),
      para(
        'Copy or symlink the skills from the vendored subtree (',
        inlineCode('repos/foldkit/skills/'),
        ') into one of those directories. OpenCode also reads ',
        inlineCode('AGENTS.md'),
        ', so the conventions the starter template ships already apply.',
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
