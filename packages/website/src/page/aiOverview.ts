import type { Html } from 'foldkit/html'

import { div } from '../html'
import type { TableOfContentsEntry } from '../main'
import { link, pageTitle, para, tableOfContentsEntryToHeader } from '../prose'
import {
  aiSkillsRouter,
  patternsOutMessageRouter,
  patternsSubmodelsRouter,
} from '../route'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const skillsPluginHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'skills-plugin',
  text: 'Skills Plugin',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  skillsPluginHeader,
]

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('ai/overview', 'AI'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Most frameworks give AI tools too much freedom. State can live anywhere, effects can happen anywhere, and there\u2019s no canonical structure to follow. The result is generated code that works but doesn\u2019t hold up.',
      ),
      para(
        'Foldkit\u2019s architecture changes this. The Elm Architecture enforces a rigid, yet expressive structure \u2014 Message \u2192 update \u2192 Model \u2192 view \u2192 Command \u2014 where every piece has a canonical shape and a canonical place. The same constraints that make your code correct make it machine-legible.',
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
      tableOfContentsEntryToHeader(skillsPluginHeader),
      para(
        'Foldkit ships a ',
        link(aiSkillsRouter(), 'skills plugin'),
        ' for Claude Code that encodes Foldkit\u2019s conventions, patterns, and quality standards into agent workflows. The skills reference the actual example code in the Foldkit repository, so the generated output stays in sync with the framework as it evolves.',
      ),
    ],
  )
