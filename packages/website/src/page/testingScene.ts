import { Html } from 'foldkit/html'

import { Class, InnerHTML, code, div, li, ul } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const plainCode = (text: string): Html => code([Class('text-sm')], [text])

const mountSemanticsList: Html = ul(
  [Class('list-disc mb-8 space-y-2 pl-6')],
  [
    li(
      [],
      [
        'Pending mounts persist across re-renders. Resolving a mount does not re-pend it on the next render.',
      ],
    ),
    li(
      [],
      [
        'A mount whose element disappears from the tree before being resolved is silently dropped. There is no real cleanup to run in test-land.',
      ],
    ),
    li(
      [],
      [
        'Same-named mounts coexisting in the tree are disambiguated by an occurrence index, so two open instances of the same component do not collide.',
      ],
    ),
    li(
      [],
      [
        'Interactions throw if there are unresolved mounts when they try to dispatch a Message. The same contract as Commands.',
      ],
    ),
    li(
      [],
      [
        'Scene.scene throws at the end if any mount is unresolved. Also the same contract as Commands.',
      ],
    ),
  ],
)

const whyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing-through-the-view',
  text: 'Testing Through the View',
}

const locatorsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'locators',
  text: 'Locators',
}

const roleHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'scene-role',
  text: 'Scene.role',
}

const scopingHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'scoping',
  text: 'Scoping',
}

const multiMatchHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'multi-match',
  text: 'Multi-Match',
}

const interactionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'interactions',
  text: 'Interactions',
}

const assertionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'assertions',
  text: 'Assertions',
}

const commandAssertionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'command-assertions',
  text: 'Command Assertions',
}

const mountStepsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'mount-steps',
  text: 'Mount Steps',
}

const exampleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'a-complete-scene',
  text: 'A Complete Scene',
}

const storyVsSceneHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'story-vs-scene',
  text: 'Story vs Scene',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  whyHeader,
  locatorsHeader,
  roleHeader,
  scopingHeader,
  multiMatchHeader,
  interactionsHeader,
  assertionsHeader,
  commandAssertionsHeader,
  mountStepsHeader,
  exampleHeader,
  storyVsSceneHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('testing-scene', 'Scene'),
      tableOfContentsEntryToHeader(whyHeader),
      para(
        inlineCode('Scene'),
        ' tests features through the rendered view. Where ',
        link('/testing/story', 'Story'),
        ' sends Messages directly to update, Scene clicks buttons, types into inputs, presses keys, and asserts on the rendered VNode tree. The view function runs on every step, so if it crashes or renders the wrong thing, the test catches it.',
      ),
      para(
        'Scene operates on the VNode tree directly. No DOM, no JSDOM, no browser. Tests are pure, deterministic, and fast.',
      ),
      tableOfContentsEntryToHeader(locatorsHeader),
      para(
        'Locators find elements the way users find them: by role, by label, by visible text. Each factory returns a ',
        inlineCode('Locator'),
        ' that resolves to a single match; interactions and assertions accept either a Locator or a raw CSS selector string.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.sceneLocatorsHighlighted)],
          [],
        ),
        Snippets.sceneLocatorsRaw,
        'Copy locator examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      comparisonTable(
        ['Locator', 'Finds', 'Example'],
        [
          [
            [plainCode('Scene.role(role, options?)')],
            [
              'Elements by ARIA role (explicit or implicit). Options narrow by accessible name and ARIA state.',
            ],
            [plainCode("Scene.role('button', { name: 'Save' })")],
          ],
          [
            [plainCode('Scene.label(text)')],
            ['Form controls by their aria-label or associated <label> text.'],
            [plainCode("Scene.label('Email')")],
          ],
          [
            [plainCode('Scene.placeholder(text)')],
            ['Inputs by their placeholder attribute.'],
            [plainCode("Scene.placeholder('Search...')")],
          ],
          [
            [plainCode('Scene.text(text)')],
            ['Elements by visible text content.'],
            [plainCode("Scene.text('Welcome back')")],
          ],
          [
            [plainCode('Scene.altText(text)')],
            ['Images and similar elements by their alt attribute.'],
            [plainCode("Scene.altText('Profile photo')")],
          ],
          [
            [plainCode('Scene.title(text)')],
            ['Elements by their title attribute (tooltip text).'],
            [plainCode("Scene.title('Delete')")],
          ],
          [
            [plainCode('Scene.testId(id)')],
            ['Elements by data-testid: the escape hatch for tests.'],
            [plainCode("Scene.testId('cart-item-3')")],
          ],
          [
            [plainCode('Scene.displayValue(value)')],
            ['Form controls by their current value.'],
            [plainCode("Scene.displayValue('US')")],
          ],
          [
            [plainCode('Scene.selector(css)')],
            ['Elements by CSS selector. Use when no accessible query fits.'],
            [plainCode("Scene.selector('.chart-legend')")],
          ],
        ],
      ),
      tableOfContentsEntryToHeader(roleHeader),
      para(
        inlineCode('Scene.role'),
        ' is the most common locator. It accepts a second argument of state options that narrow the match. All options are optional:',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.sceneRoleHighlighted)], []),
        Snippets.sceneRoleRaw,
        'Copy Scene.role examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      comparisonTable(
        ['Option', 'Type', 'Matches'],
        [
          [
            [plainCode('name')],
            [plainCode('string | RegExp')],
            [
              'Accessible name (aria-label, aria-labelledby, label[for], or text content). Strings match exactly; regular expressions match against the full name.',
            ],
          ],
          [
            [plainCode('level')],
            [plainCode('number')],
            ['Heading level (for role: "heading")'],
          ],
          [
            [plainCode('checked')],
            [plainCode("boolean | 'mixed'")],
            ['aria-checked or the checked attribute'],
          ],
          [[plainCode('selected')], [plainCode('boolean')], ['aria-selected']],
          [
            [plainCode('pressed')],
            [plainCode("boolean | 'mixed'")],
            ['aria-pressed'],
          ],
          [[plainCode('expanded')], [plainCode('boolean')], ['aria-expanded']],
          [
            [plainCode('disabled')],
            [plainCode('boolean')],
            ['aria-disabled or the disabled attribute'],
          ],
        ],
      ),
      tableOfContentsEntryToHeader(scopingHeader),
      para(
        inlineCode('Scene.within(parent, child)'),
        ' scopes a single locator to a parent element. ',
        inlineCode('Scene.inside(parent, ...steps)'),
        ' scopes a whole block of steps. Every assertion or interaction inside the block resolves within the parent\u2019s subtree. Use ',
        inlineCode('within'),
        ' for one-off scoped queries; use ',
        inlineCode('inside'),
        ' when several steps share the same scope. Nested ',
        inlineCode('inside'),
        ' calls compose.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.sceneScopingHighlighted)],
          [],
        ),
        Snippets.sceneScopingRaw,
        'Copy scoping examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(multiMatchHeader),
      para(
        'For lists and repeated elements, the ',
        inlineCode('Scene.all.*'),
        ' factories (',
        inlineCode('Scene.all.role'),
        ', ',
        inlineCode('Scene.all.text'),
        ', ',
        inlineCode('Scene.all.label'),
        ', and so on, one per single-match factory) return a ',
        inlineCode('LocatorAll'),
        ' that resolves to every match. Pick one with ',
        inlineCode('Scene.first'),
        ', ',
        inlineCode('Scene.last'),
        ', or ',
        inlineCode('Scene.nth(index)'),
        ', or narrow with ',
        inlineCode('Scene.filter'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.sceneMultiMatchHighlighted)],
          [],
        ),
        Snippets.sceneMultiMatchRaw,
        'Copy multi-match examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      comparisonTable(
        ['Filter option', 'Keeps matches where'],
        [
          [
            [plainCode('has')],
            ['The element contains a descendant matching the given Locator'],
          ],
          [
            [plainCode('hasNot')],
            ['The element does not contain a descendant matching the Locator'],
          ],
          [
            [plainCode('hasText')],
            ['The element\u2019s text content includes the given substring'],
          ],
          [
            [plainCode('hasNotText')],
            ['The element\u2019s text content does not include the substring'],
          ],
        ],
      ),
      tableOfContentsEntryToHeader(interactionsHeader),
      para(
        'Interactions exercise the view by invoking event handlers on matched elements. Each one captures the dispatched Message, feeds it through update, and re-renders. They accept either a Locator or a CSS selector string.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.sceneInteractionsHighlighted)],
          [],
        ),
        Snippets.sceneInteractionsRaw,
        'Copy interaction examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      comparisonTable(
        ['Step', 'Invokes'],
        [
          [
            [plainCode('Scene.click(target)')],
            [plainCode('OnClick'), ' (bubbles to ancestors)'],
          ],
          [
            [plainCode('Scene.doubleClick(target)')],
            [plainCode('OnDoubleClick'), ' (bubbles to ancestors)'],
          ],
          [
            [plainCode('Scene.pointerDown(target, options?)')],
            [
              plainCode('OnPointerDown'),
              ' with optional ',
              plainCode('{ pointerType, button, screenX, screenY }'),
              ' (bubbles to ancestors)',
            ],
          ],
          [
            [plainCode('Scene.pointerUp(target, options?)')],
            [
              plainCode('OnPointerUp'),
              ' with optional ',
              plainCode('{ pointerType, screenX, screenY }'),
              ' (bubbles to ancestors)',
            ],
          ],
          [
            [plainCode('Scene.hover(target)')],
            [
              plainCode('OnMouseEnter'),
              ' (falls back to ',
              plainCode('OnMouseOver'),
              ')',
            ],
          ],
          [[plainCode('Scene.focus(target)')], [plainCode('OnFocus')]],
          [[plainCode('Scene.blur(target)')], [plainCode('OnBlur')]],
          [
            [plainCode('Scene.type(target, text)')],
            [plainCode('OnInput'), ' with the given text'],
          ],
          [
            [plainCode('Scene.change(target, value)')],
            [
              plainCode('OnChange'),
              ' with the given value, for ',
              plainCode('<select>'),
              ' and similar',
            ],
          ],
          [
            [plainCode('Scene.keydown(target, key, modifiers?)')],
            [
              plainCode('OnKeyDown'),
              ' or ',
              plainCode('OnKeyDownPreventDefault'),
              ' with optional ',
              plainCode('{ shiftKey, ctrlKey, altKey, metaKey }'),
            ],
          ],
          [[plainCode('Scene.submit(target)')], [plainCode('OnSubmit')]],
        ],
      ),
      para(
        inlineCode('Scene.tap(fn)'),
        ' runs a function for side effects (like ad-hoc assertions on raw VNodes or accumulated Commands) without breaking the step chain.',
      ),
      tableOfContentsEntryToHeader(assertionsHeader),
      para(
        inlineCode('Scene.expect(locator)'),
        ' creates an inline assertion step against a single element. Every matcher has a ',
        inlineCode('.not'),
        ' variant that inverts the assertion.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.sceneAssertionsHighlighted)],
          [],
        ),
        Snippets.sceneAssertionsRaw,
        'Copy assertion examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      comparisonTable(
        ['Matcher', 'Asserts that the element'],
        [
          [[plainCode('.toExist()')], ['Is present in the tree']],
          [[plainCode('.toBeAbsent()')], ['Is not present in the tree']],
          [
            [plainCode('.toBeVisible()')],
            [
              'Is not hidden via the hidden attribute, aria-hidden, display: none, or visibility: hidden',
            ],
          ],
          [
            [plainCode('.toBeEmpty()')],
            ['Has no text content or child elements'],
          ],
          [
            [plainCode('.toHaveText(value)')],
            [
              'Has text content equal to the given string or matching the given regex',
            ],
          ],
          [
            [plainCode('.toContainText(value)')],
            [
              'Has text content including the given substring or matching the regex',
            ],
          ],
          [
            [plainCode('.toHaveAccessibleName(name)')],
            [
              'Has the given accessible name (resolves aria-labelledby, aria-label, label[for], text content)',
            ],
          ],
          [
            [plainCode('.toHaveAccessibleDescription(description)')],
            [
              'Has the given accessible description (resolves aria-describedby)',
            ],
          ],
          [
            [plainCode('.toBeDisabled()')],
            ['Has aria-disabled or the disabled attribute'],
          ],
          [[plainCode('.toBeEnabled()')], ['Is not disabled']],
          [
            [plainCode('.toBeChecked()')],
            ['Has aria-checked="true" or the checked attribute'],
          ],
          [
            [plainCode('.toHaveValue(value)')],
            ['Has the given current form-control value'],
          ],
          [
            [plainCode('.toHaveAttr(name, value)')],
            ['Has the given attribute set to the given value'],
          ],
          [[plainCode('.toHaveId(id)')], ['Has the given id']],
          [[plainCode('.toHaveClass(name)')], ['Has the given CSS class']],
          [
            [plainCode('.toHaveStyle(name, value)')],
            ['Has the given inline style property'],
          ],
        ],
      ),
      para(
        'For ',
        inlineCode('LocatorAll'),
        ' (from ',
        inlineCode('Scene.all.*'),
        '), use ',
        inlineCode('Scene.expectAll(locatorAll)'),
        ' for count-based assertions:',
      ),
      comparisonTable(
        ['Matcher', 'Asserts that'],
        [
          [
            [plainCode('.toHaveCount(n)')],
            ['The locator matches exactly n elements'],
          ],
          [[plainCode('.toBeEmpty()')], ['The locator matches zero elements']],
        ],
      ),
      tableOfContentsEntryToHeader(commandAssertionsHeader),
      para(
        'Scene can also assert on pending Commands. Use these steps to verify that an interaction produced the Commands you expect before resolving them:',
      ),
      comparisonTable(
        ['Step', 'Asserts that'],
        [
          [
            [plainCode('Scene.Command.expectExact(A, B)')],
            ['The pending Commands are exactly A and B (order-independent)'],
          ],
          [
            [plainCode('Scene.Command.expectHas(A)')],
            ['A is among the pending Commands (subset check)'],
          ],
          [
            [plainCode('Scene.Command.expectNone()')],
            ['There are no pending Commands'],
          ],
        ],
      ),
      para(
        'Prefer ',
        inlineCode('Scene.Command.expectExact'),
        ' as the default. It catches bugs where an interaction produces unexpected Commands. Use ',
        inlineCode('Scene.Command.expectHas'),
        ' when you only care about a subset of the pending Commands.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.sceneCommandAssertionsHighlighted),
          ],
          [],
        ),
        Snippets.sceneCommandAssertionsRaw,
        'Copy command assertions example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(mountStepsHeader),
      para(
        'Mount is Command’s sibling, declared by the view rather than by ',
        inlineCode('update'),
        '. When the rendered tree contains an ',
        inlineCode('OnMount'),
        ' attribute, Scene tracks the mount as pending until you acknowledge it with the result Message it would produce in production. The mechanic mirrors Command resolution: the view declares the side effect, the test declares its outcome.',
      ),
      para(
        'Component views that include ',
        inlineCode('OnMount'),
        ' (popovers positioning their panels, listboxes focusing items, custom mounts that integrate with third-party DOM libraries) declare a mount whenever they render. Before this lifecycle was tracked, tests worked around it by pre-baking a "post-mount" Model fixture (e.g. a ',
        inlineCode('mountedModel'),
        ' with the host id already set). With ',
        inlineCode('Scene.Mount.resolve'),
        ', the test exercises the same path users do: the view renders, the mount fires, the result Message updates the Model.',
      ),
      para('Mount tracking has a few semantics worth knowing:'),
      mountSemanticsList,
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.sceneMountAssertionsHighlighted),
          ],
          [],
        ),
        Snippets.sceneMountAssertionsRaw,
        'Copy mount assertions example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      comparisonTable(
        ['Step', 'Effect'],
        [
          [
            [plainCode('Scene.Mount.resolve(Def, ResultMessage)')],
            [
              'Resolves the first pending mount with the given name by feeding ',
              plainCode('ResultMessage'),
              ' through update. Accepts an optional ',
              plainCode('toParentMessage'),
              ' lifter, mirroring ',
              plainCode('Scene.Command.resolve'),
              '.',
            ],
          ],
          [
            [plainCode('Scene.Mount.resolveAll([Def, Msg], ...)')],
            ['Resolves a batch of pending mounts in order.'],
          ],
          [
            [plainCode('Scene.Mount.expectExact(A, B)')],
            [
              'The pending mounts are exactly A and B (order-independent, by name).',
            ],
          ],
          [
            [plainCode('Scene.Mount.expectHas(A)')],
            ['A is among the pending mounts (subset check).'],
          ],
          [
            [plainCode('Scene.Mount.expectNone()')],
            ['There are no pending mounts.'],
          ],
        ],
      ),
      para(
        'Like Commands, mounts must be resolved before an interaction dispatches another Message, and ',
        inlineCode('Scene.scene'),
        ' throws at the end if any pending mount remains. UI components export their Mount definitions (',
        inlineCode('Popover.PopoverAnchor'),
        ', ',
        inlineCode('Listbox.ListboxAnchor'),
        ', and so on) so consumer tests can name them in ',
        inlineCode('Scene.Mount.resolve'),
        '.',
      ),
      tableOfContentsEntryToHeader(exampleHeader),
      para(
        'Here\u2019s a Scene test for a weather app. The user types a zip code, clicks Get Weather, sees a loading state, and then the forecast appears:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.sceneWeatherFlowHighlighted)],
          [],
        ),
        Snippets.sceneWeatherFlowRaw,
        'Copy Scene weather example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Every interaction targets an element the way a user would: by label, by role, by placeholder. Every assertion reads like a sentence. Commands are resolved inline, just like in Story.',
      ),
      tableOfContentsEntryToHeader(storyVsSceneHeader),
      para(
        'Story and Scene are complementary. Story tests the state machine: does this sequence of Messages produce the right Model? Scene tests the contract: does this feature work from the user\u2019s perspective?',
      ),
      para(
        'Use Story for update logic, edge cases, and Command wiring. Use Scene for user flows, view rendering, and accessibility. A well-tested app uses both.',
      ),
    ],
  )
