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
import { gettingStartedRouter } from '../route'
import * as Snippet from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

type RuleExample = {
  readonly heading: TableOfContentsEntry
  readonly description: string
  readonly raw: string
  readonly highlighted: string
}

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const foldkitRulesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'foldkit-rules',
  text: 'Foldkit Rules',
}

const scaffoldHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scaffolded-projects',
  text: 'Scaffolded Projects',
}

const foldkitRuleExamples: ReadonlyArray<RuleExample> = [
  {
    heading: {
      level: 'h3',
      id: 'no-noop-message',
      text: 'foldkit/no-noop-message',
    },
    description:
      'Rejects catch-all Messages that make update branches and traces less meaningful. Name the event that happened instead.',
    raw: Snippet.lintNoNoopMessageRaw,
    highlighted: Snippet.lintNoNoopMessageHighlighted,
  },
  {
    heading: {
      level: 'h3',
      id: 'got-submodel-message-name',
      text: 'foldkit/got-submodel-message-name',
    },
    description:
      'Requires wrapper Messages around Submodel Messages to use the Got*Message convention.',
    raw: Snippet.lintGotSubmodelMessageNameRaw,
    highlighted: Snippet.lintGotSubmodelMessageNameHighlighted,
  },
  {
    heading: {
      level: 'h3',
      id: 'message-binding-matches-tag',
      text: 'foldkit/message-binding-matches-tag',
    },
    description:
      'Keeps a Message binding and its m() tag identical, so renames do not leave misleading traces behind.',
    raw: Snippet.lintMessageBindingMatchesTagRaw,
    highlighted: Snippet.lintMessageBindingMatchesTagHighlighted,
  },
  {
    heading: {
      level: 'h3',
      id: 'got-prefix-requires-submodel-payload',
      text: 'foldkit/got-prefix-requires-submodel-payload',
    },
    description:
      'Reserves the Got* prefix for Submodel wrappers. Any Got-prefixed Message must include a child Message payload named message.',
    raw: Snippet.lintGotPrefixRequiresSubmodelPayloadRaw,
    highlighted: Snippet.lintGotPrefixRequiresSubmodelPayloadHighlighted,
  },
  {
    heading: {
      level: 'h3',
      id: 'no-empty-object-tagged-call',
      text: 'foldkit/no-empty-object-tagged-call',
    },
    description:
      'Catches empty-object calls to no-field Message constructors. A no-field Message should be called with no arguments.',
    raw: Snippet.lintNoEmptyObjectTaggedCallRaw,
    highlighted: Snippet.lintNoEmptyObjectTaggedCallHighlighted,
  },
  {
    heading: {
      level: 'h3',
      id: 'prefer-callable-message-constructor',
      text: 'foldkit/prefer-callable-message-constructor',
    },
    description:
      'Prevents constructing Messages by typing or casting object literals. Use the callable Schema constructor instead.',
    raw: Snippet.lintPreferCallableMessageConstructorRaw,
    highlighted: Snippet.lintPreferCallableMessageConstructorHighlighted,
  },
  {
    heading: {
      level: 'h3',
      id: 'command-binding-matches-name',
      text: 'foldkit/command-binding-matches-name',
    },
    description:
      'Keeps a Command binding name in sync with the name passed to Command.define.',
    raw: Snippet.lintCommandBindingMatchesNameRaw,
    highlighted: Snippet.lintCommandBindingMatchesNameHighlighted,
  },
]

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  scaffoldHeader,
  foldkitRulesHeader,
  ...foldkitRuleExamples.map(({ heading }) => heading),
]

const ruleExampleView =
  (copiedSnippets: CopiedSnippets) =>
  (rule: RuleExample): Html => {
    const h = html<Message>()

    return h.div(
      [h.Class('mb-10')],
      [
        tableOfContentsEntryToHeader(rule.heading),
        para(rule.description),
        highlightedCodeBlock(
          h.div([h.Class('text-sm'), h.InnerHTML(rule.highlighted)], []),
          rule.raw,
          `Copy ${rule.heading.text} example`,
          copiedSnippets,
        ),
      ],
    )
  }

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('tooling/oxlint-plugin', 'Oxlint Plugin'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit projects use ',
        inlineCode('oxlint'),
        ' for linting and ',
        inlineCode('@foldkit/oxlint-plugin'),
        ' for rules that understand Foldkit naming and Message conventions.',
      ),
      tableOfContentsEntryToHeader(scaffoldHeader),
      para(
        link(gettingStartedRouter(), 'Create Foldkit app'),
        ' includes ',
        inlineCode('.oxlintrc.json'),
        ', a ',
        inlineCode('lint'),
        ' script, ',
        inlineCode('oxlint'),
        ', and ',
        inlineCode('@foldkit/oxlint-plugin'),
        '. A generated project includes this ',
        inlineCode('.oxlintrc.json'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.oxlintConfigHighlighted)],
          [],
        ),
        Snippet.oxlintConfigRaw,
        'Copy oxlint config',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(foldkitRulesHeader),
      para(
        'The rules below cover Foldkit-specific cases that oxlint does not know about on its own: callable Message constructors, Submodel wrapper Messages with a ',
        inlineCode('message'),
        ' payload, matching ',
        inlineCode('m()'),
        ' tags, no-field Message constructors, and Command names.',
      ),
      ...foldkitRuleExamples.map(ruleExampleView(copiedSnippets)),
    ],
  )
}
