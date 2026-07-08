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

type RuleGroup = {
  readonly heading: TableOfContentsEntry
  readonly rules: ReadonlyArray<RuleExample>
}

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const scaffoldHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scaffolded-projects',
  text: 'Scaffolded Projects',
}

const ruleHeading = (name: string): TableOfContentsEntry => ({
  level: 'h3',
  id: name,
  text: `foldkit/${name}`,
})

const groupHeading = (id: string, text: string): TableOfContentsEntry => ({
  level: 'h2',
  id,
  text,
})

const ruleGroups: ReadonlyArray<RuleGroup> = [
  {
    heading: groupHeading('message-rules', 'Message Naming and Construction'),
    rules: [
      {
        heading: ruleHeading('no-noop-message'),
        description:
          'Rejects catch-all Messages that make update branches and traces less meaningful. Name the event that happened instead.',
        raw: Snippet.lintNoNoopMessageRaw,
        highlighted: Snippet.lintNoNoopMessageHighlighted,
      },
      {
        heading: ruleHeading('message-binding-matches-tag'),
        description:
          'Keeps a Message binding and its m() tag identical, so renames do not leave misleading traces behind.',
        raw: Snippet.lintMessageBindingMatchesTagRaw,
        highlighted: Snippet.lintMessageBindingMatchesTagHighlighted,
      },
      {
        heading: ruleHeading('no-empty-object-tagged-call'),
        description:
          'Catches empty-object calls to no-field Message constructors. A no-field Message should be called with no arguments.',
        raw: Snippet.lintNoEmptyObjectTaggedCallRaw,
        highlighted: Snippet.lintNoEmptyObjectTaggedCallHighlighted,
      },
      {
        heading: ruleHeading('prefer-callable-message-constructor'),
        description:
          'Prevents constructing Messages by typing or casting object literals. Use the callable Schema constructor instead.',
        raw: Snippet.lintPreferCallableMessageConstructorRaw,
        highlighted: Snippet.lintPreferCallableMessageConstructorHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('command-rules', 'Command Shape'),
    rules: [
      {
        heading: ruleHeading('command-binding-matches-name'),
        description:
          'Keeps a Command binding name in sync with the name passed to Command.define.',
        raw: Snippet.lintCommandBindingMatchesNameRaw,
        highlighted: Snippet.lintCommandBindingMatchesNameHighlighted,
      },
      {
        heading: ruleHeading('command-define-pascal-const'),
        description:
          'Requires the const holding a Command.define result to be a non-empty PascalCase identifier that matches the Command name.',
        raw: Snippet.lintCommandDefinePascalConstRaw,
        highlighted: Snippet.lintCommandDefinePascalConstHighlighted,
      },
      {
        heading: ruleHeading('no-hand-rolled-command-struct'),
        description:
          'Rejects Command structs assembled by hand. Command.define attaches the identity, args, and tracing metadata a plain object literal skips.',
        raw: Snippet.lintNoHandRolledCommandStructRaw,
        highlighted: Snippet.lintNoHandRolledCommandStructHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('model-update-rules', 'Model Updates'),
    rules: [
      {
        heading: ruleHeading('no-spread-in-evo'),
        description:
          'Rejects object spreads inside an evo updater. Evolve nested fields with a nested evo instead.',
        raw: Snippet.lintNoSpreadInEvoRaw,
        highlighted: Snippet.lintNoSpreadInEvoHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('routing-rules', 'Routing'),
    rules: [
      {
        heading: ruleHeading('no-hardcoded-route-strings'),
        description:
          'Rejects hardcoded path and URL strings passed to link and navigation helpers. Build them from the Route module so they stay in sync with the routes.',
        raw: Snippet.lintNoHardcodedRouteStringsRaw,
        highlighted: Snippet.lintNoHardcodedRouteStringsHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('view-rules', 'View Keying and Accessibility'),
    rules: [
      {
        heading: ruleHeading('no-array-index-view-keys'),
        description:
          'Rejects the array index as a view key. Key by a stable Model identifier, or reordering the list patches the wrong rows.',
        raw: Snippet.lintNoArrayIndexViewKeysRaw,
        highlighted: Snippet.lintNoArrayIndexViewKeysHighlighted,
      },
      {
        heading: ruleHeading('keyed-required-for-mapped-rows'),
        description:
          'Requires an identity-bearing mapped row element to be wrapped in keyed, so the runtime patches the right rows when the list reorders or shrinks.',
        raw: Snippet.lintKeyedRequiredForMappedRowsRaw,
        highlighted: Snippet.lintKeyedRequiredForMappedRowsHighlighted,
      },
      {
        heading: ruleHeading('require-rel-for-external-link'),
        description:
          'Requires target="_blank" links to carry a rel with noopener or noreferrer.',
        raw: Snippet.lintRequireRelForExternalLinkRaw,
        highlighted: Snippet.lintRequireRelForExternalLinkHighlighted,
      },
      {
        heading: ruleHeading('no-raw-dom-event-attributes'),
        description:
          'Rejects raw DOM event attributes. Use the typed event helpers so handlers dispatch Messages through the runtime.',
        raw: Snippet.lintNoRawDomEventAttributesRaw,
        highlighted: Snippet.lintNoRawDomEventAttributesHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('purity-rules', 'Purity Boundaries'),
    rules: [
      {
        heading: ruleHeading('no-module-level-mutable-state'),
        description:
          'Rejects module-level let and var bindings, which hold state outside the Model. Move the data into the Model, or scope a live handle to a lifecycle primitive like Mount or ManagedResource.',
        raw: Snippet.lintNoModuleLevelMutableStateRaw,
        highlighted: Snippet.lintNoModuleLevelMutableStateHighlighted,
      },
      {
        heading: ruleHeading('no-disabling-dev-guardrails'),
        description:
          'Flags turning off the freezeModel or slow dev guardrails. Fix the mutation or slow phase they caught instead of silencing the feedback.',
        raw: Snippet.lintNoDisablingDevGuardrailsRaw,
        highlighted: Snippet.lintNoDisablingDevGuardrailsHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('submodel-rules', 'Submodel Wiring'),
    rules: [
      {
        heading: ruleHeading('got-submodel-message-name'),
        description:
          'Requires wrapper Messages around Submodel Messages to use the Got*Message convention.',
        raw: Snippet.lintGotSubmodelMessageNameRaw,
        highlighted: Snippet.lintGotSubmodelMessageNameHighlighted,
      },
      {
        heading: ruleHeading('got-prefix-requires-submodel-payload'),
        description:
          'Reserves the Got* prefix for Submodel wrappers. Any Got-prefixed Message must include a child Message payload named message.',
        raw: Snippet.lintGotPrefixRequiresSubmodelPayloadRaw,
        highlighted: Snippet.lintGotPrefixRequiresSubmodelPayloadHighlighted,
      },
      {
        heading: ruleHeading('wrap-child-output-in-got-message'),
        description:
          'Requires child Command and Subscription output to be wrapped through a Got*Message constructor, preserving the one-wrap-per-level Submodel convention.',
        raw: Snippet.lintWrapChildOutputInGotMessageRaw,
        highlighted: Snippet.lintWrapChildOutputInGotMessageHighlighted,
      },
      {
        heading: ruleHeading('got-wrapper-carries-only-routing'),
        description:
          'Keeps a Got wrapper payload to the child Message plus routing keys: message, id, or keys ending in Id.',
        raw: Snippet.lintGotWrapperCarriesOnlyRoutingRaw,
        highlighted: Snippet.lintGotWrapperCarriesOnlyRoutingHighlighted,
      },
      {
        heading: ruleHeading('no-child-message-construction-in-root'),
        description:
          'Rejects constructing a child Message variant from outside the child. Call a child-exported helper and route its output through the wrapper.',
        raw: Snippet.lintNoChildMessageConstructionInRootRaw,
        highlighted: Snippet.lintNoChildMessageConstructionInRootHighlighted,
      },
      {
        heading: ruleHeading('selection-submodel-factory-at-module-scope'),
        description:
          'Requires selection component factories, such as Combobox, Listbox, Menu, and Tabs, to be created at module scope so their identity stays stable across renders.',
        raw: Snippet.lintSelectionSubmodelFactoryAtModuleScopeRaw,
        highlighted:
          Snippet.lintSelectionSubmodelFactoryAtModuleScopeHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('lifecycle-rules', 'Lifecycle Handles'),
    rules: [
      {
        heading: ruleHeading('mount-factory-must-use-element'),
        description:
          'Requires a Mount factory to read or write its element. If it never touches the element, the cause was misidentified and Mount is the wrong primitive.',
        raw: Snippet.lintMountFactoryMustUseElementRaw,
        highlighted: Snippet.lintMountFactoryMustUseElementHighlighted,
      },
      {
        heading: ruleHeading('no-duplicate-onmount-per-element'),
        description:
          'Rejects two OnMount handlers on one element, where the second silently overwrites the first.',
        raw: Snippet.lintNoDuplicateOnmountPerElementRaw,
        highlighted: Snippet.lintNoDuplicateOnmountPerElementHighlighted,
      },
    ],
  },
  {
    heading: groupHeading('dom-ui-rules', 'DOM and UI Helpers'),
    rules: [
      {
        heading: ruleHeading('lazy-view-stable-references'),
        description:
          'Requires lazy view slots to be declared at module scope so their references stay stable and the memoization actually hits its cache.',
        raw: Snippet.lintLazyViewStableReferencesRaw,
        highlighted: Snippet.lintLazyViewStableReferencesHighlighted,
      },
    ],
  },
]

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  scaffoldHeader,
  ...ruleGroups.flatMap(group => [
    group.heading,
    ...group.rules.map(({ heading }) => heading),
  ]),
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

const ruleGroupView =
  (copiedSnippets: CopiedSnippets) =>
  (group: RuleGroup): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        tableOfContentsEntryToHeader(group.heading),
        ...group.rules.map(ruleExampleView(copiedSnippets)),
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
        '. A generated project enables this starter set of rules:',
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
      para(
        'The full rule set is grouped by convention surface below. The rules enabled in the scaffold config above are the starter set; the rest are opt-in. Turn one on by adding ',
        inlineCode('"foldkit/<rule-name>": "error"'),
        ' to the ',
        inlineCode('rules'),
        ' block. Each rule covers a Foldkit-specific case that oxlint does not know about on its own.',
      ),
      ...ruleGroups.map(ruleGroupView(copiedSnippets)),
    ],
  )
}
