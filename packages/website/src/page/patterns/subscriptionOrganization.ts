import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreSubmodelRouter, coreSubscriptionsRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const compositionLevelsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'composition-levels',
  text: 'The Composition Levels',
}

const compositionVerbsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'composition-verbs',
  text: 'The Composition Verbs',
}

const principlesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'organization-principles',
  text: 'Organization Principles',
}

const submodelCohesionHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'submodel-cohesion',
  text: 'Submodel Cohesion',
}

const oneWrapPerLevelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'one-wrap-per-level',
  text: 'One Wrap Per Level',
}

const uniformInterfaceHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'uniform-interface',
  text: 'Uniform Interface',
}

const puttingItTogetherHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'putting-it-together',
  text: 'Putting It Together',
}

const leafSubmodelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'leaf-submodel',
  text: 'The Leaf Submodel',
}

const composingSubmodelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'composing-submodel',
  text: 'The Composing Submodel',
}

const rootHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'root',
  text: 'The Root',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  compositionLevelsHeader,
  compositionVerbsHeader,
  principlesHeader,
  submodelCohesionHeader,
  oneWrapPerLevelHeader,
  uniformInterfaceHeader,
  puttingItTogetherHeader,
  leafSubmodelHeader,
  composingSubmodelHeader,
  rootHeader,
]

const verbHeaderCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const verbNameCellClassName = 'py-2.5 pr-4 align-top'

const verbCellClassName =
  'py-2.5 pr-4 align-top text-gray-700 dark:text-gray-300'

const verbNameClassName =
  'font-mono text-sm text-gray-900 dark:text-gray-200 whitespace-nowrap'

type VerbRowSpec = Readonly<{
  name: string
  whatItDoes: ReadonlyArray<string | Html>
  whenToUseIt: ReadonlyArray<string | Html>
}>

const verbs: ReadonlyArray<VerbRowSpec> = [
  {
    name: 'Subscription.make',
    whatItDoes: [
      'Declares a Subscriptions record at the current level. Each entry pairs a dependency field map with ',
      inlineCode('modelToDependencies', 'text-xs'),
      ' and ',
      inlineCode('dependenciesToStream', 'text-xs'),
      ' callbacks.',
    ],
    whenToUseIt: ['The current level has Subscriptions of its own to declare.'],
  },
  {
    name: 'Subscription.lift',
    whatItDoes: [
      'Lifts a child Submodel’s Subscriptions into the current level’s Model and Message via one ',
      inlineCode('toChildModel', 'text-xs'),
      ' lens and one ',
      inlineCode('toParentMessage', 'text-xs'),
      ' constructor.',
    ],
    whenToUseIt: [
      'Embedding a child whose Subscriptions all share the same wrapper Message.',
    ],
  },
  {
    name: 'Subscription.aggregate',
    whatItDoes: [
      'Combines two or more Subscriptions records into one. Throws at startup on duplicate keys instead of silently overriding.',
    ],
    whenToUseIt: [
      'A level combines multiple sources of Subscriptions (lifted children, inline entries, or both).',
    ],
  },
]

const verbRow = ({ name, whatItDoes, whenToUseIt }: VerbRowSpec): Html => {
  const h = html<Message>()

  return h.tr(
    [h.Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      h.td(
        [h.Class(verbNameCellClassName)],
        [h.div([h.Class(verbNameClassName)], [name])],
      ),
      h.td([h.Class(verbCellClassName)], whatItDoes),
      h.td([h.Class(verbCellClassName)], whenToUseIt),
    ],
  )
}

const verbsTable = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-6')],
    [
      h.table(
        [h.Class('w-full text-sm')],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                [
                  h.th(
                    [h.Class(verbHeaderCellClassName), h.Scope('col')],
                    ['Verb'],
                  ),
                  h.th(
                    [h.Class(verbHeaderCellClassName), h.Scope('col')],
                    ['What it does'],
                  ),
                  h.th(
                    [h.Class(verbHeaderCellClassName), h.Scope('col')],
                    ['When to reach for it'],
                  ),
                ],
              ),
            ],
          ),
          h.tbody([], verbs.map(verbRow)),
        ],
      ),
    ],
  )
}

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle(
        'patterns/subscription-organization',
        'Subscription Organization',
      ),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Once your app uses ',
        link(coreSubmodelRouter(), 'Submodel'),
        ' and any of those Submodels need ',
        link(coreSubscriptionsRouter(), 'Subscriptions'),
        ', a question shows up: where do the Subscription definitions live, and who translates the Stream of child Messages into the parent’s Message type?',
      ),
      para(
        'This page documents the canonical answer. The shape mirrors how ',
        inlineCode('update'),
        ' and ',
        inlineCode('view'),
        ' compose across Submodels. ',
        inlineCode('Subscription.lift'),
        ' translates a child Submodel’s Stream into the parent’s Message type, and ',
        inlineCode('Subscription.aggregate'),
        ' combines that with any other Subscription records the level holds.',
      ),
      tableOfContentsEntryToHeader(compositionLevelsHeader),
      para(
        'Subscriptions compose in levels. Each level can declare its own Streams via ',
        inlineCode('Subscription.make'),
        ' and lift child Streams via ',
        inlineCode('Subscription.lift'),
        ' into the level’s Message type. The Stream emerging at the top is in the root’s Message type, ready for the runtime to dispatch through ',
        inlineCode('update'),
        '.',
      ),
      h.pre(
        [
          h.Class(
            'mb-4 mx-auto w-fit max-w-full text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 overflow-x-auto rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
          ),
        ],
        [
          '         ready for runtime processing\n' +
            '                      ↑\n' +
            '+--------------------------------------------+\n' +
            '| in subscription.ts (root)                  |\n' +
            '| lift to Message                            |\n' +
            '| via GotSettingsMessage                     |\n' +
            '| to declare                                 |\n' +
            '| Stream<Message>                            |\n' +
            '+--------------------------------------------+\n' +
            '                      ↑\n' +
            '+--------------------------------------------+\n' +
            '| in page/settings/subscription.ts           |\n' +
            '| lift to Settings.Message                   |\n' +
            '| via GotThemeMenuMessage                    |\n' +
            '| to declare                                 |\n' +
            '| Stream<Settings.Message>                   |\n' +
            '+--------------------------------------------+\n' +
            '                      ↑\n' +
            '+--------------------------------------------+\n' +
            '| in page/settings/themeMenu/subscription.ts |\n' +
            '| declare                                    |\n' +
            '| Stream<ThemeMenu.Message>                  |\n' +
            '+--------------------------------------------+',
        ],
      ),
      tableOfContentsEntryToHeader(compositionVerbsHeader),
      para(
        'Three verbs on the ',
        inlineCode('Subscription'),
        ' namespace do almost all of the composition work. Knowing which one applies at a given level is what makes a Subscription file easy to read.',
      ),
      verbsTable(),
      tableOfContentsEntryToHeader(principlesHeader),
      tableOfContentsEntryToHeader(submodelCohesionHeader),
      para(
        'A Submodel’s Subscription wiring belongs next to its Model, Message, init, update, and view. Subscriptions that emit Messages for a Submodel are part of that Submodel’s set of concerns.',
      ),
      tableOfContentsEntryToHeader(oneWrapPerLevelHeader),
      para(
        'A Subscription file produces Messages in its own Message type, and only that one. When a parent embeds it, the parent wraps the emitted Messages via ',
        inlineCode('Subscription.lift'),
        '.',
      ),
      tableOfContentsEntryToHeader(uniformInterfaceHeader),
      para(
        'Every Submodel that exposes Subscriptions exports one named value: a ',
        inlineCode('subscriptions'),
        ' record built via ',
        inlineCode('Subscription.make'),
        '. A parent embeds it by combining it through ',
        inlineCode('Subscription.aggregate'),
        ' alongside its own Subscriptions.',
      ),
      tableOfContentsEntryToHeader(puttingItTogetherHeader),
      para(
        'Here is one composition traced through every level: a leaf Submodel, a composing Submodel that embeds it, and a root that combines them.',
      ),
      tableOfContentsEntryToHeader(leafSubmodelHeader),
      para(
        'A leaf Submodel has no children with Subscriptions of their own. Its ',
        inlineCode('subscription.ts'),
        ' declares entries via ',
        inlineCode('Subscription.make'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.subscriptionOrganizationChildHighlighted),
          ],
          [],
        ),
        Snippets.subscriptionOrganizationChildRaw,
        'Copy leaf Submodel Subscription file to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(composingSubmodelHeader),
      para(
        'A Submodel that hosts Subscription-bearing children lifts each child via ',
        inlineCode('Subscription.lift'),
        ', declares any local Subscriptions via ',
        inlineCode('Subscription.make'),
        ', and combines them through ',
        inlineCode('Subscription.aggregate'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.subscriptionOrganizationComposingHighlighted),
          ],
          [],
        ),
        Snippets.subscriptionOrganizationComposingRaw,
        'Copy composing Submodel Subscription file to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(rootHeader),
      para(
        'The root ',
        inlineCode('subscription.ts'),
        ' uses the same shape as a composing Submodel. Its lifts target the root ',
        inlineCode('Model'),
        ' and ',
        inlineCode('Message'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.subscriptionOrganizationRootHighlighted),
          ],
          [],
        ),
        Snippets.subscriptionOrganizationRootRaw,
        'Copy root Subscription file to clipboard',
        copiedSnippets,
        'mb-8',
      ),
    ],
  )
}
