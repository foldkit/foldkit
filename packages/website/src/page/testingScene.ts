import { Html } from 'foldkit/html'

import { Class, InnerHTML, code, div } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const plainCode = (text: string): Html => code([Class('text-sm')], [text])

const whyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing-through-the-view',
  text: 'Testing Through the View',
}

const apiHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'locators-interactions-assertions',
  text: 'Locators, Interactions, Assertions',
}

const locatorsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'locators',
  text: 'Locators',
}

const scopingHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'scoping',
  text: 'Scoping and Multi-Match',
}

const interactionsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'interactions',
  text: 'Interactions',
}

const assertionsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'assertions',
  text: 'Assertions',
}

const submodelsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'submodel-views',
  text: 'Submodel Views',
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
  apiHeader,
  locatorsHeader,
  scopingHeader,
  interactionsHeader,
  assertionsHeader,
  submodelsHeader,
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
        ' tests features through the rendered view. Where Story sends Messages directly to update, Scene clicks buttons, types into inputs, presses keys, and asserts on the rendered HTML. The view function runs on every step, so if it crashes or renders the wrong thing, the test catches it.',
      ),
      para(
        'Scene operates on the VNode tree directly. No DOM, no JSDOM, no browser. Tests are pure, deterministic, and fast.',
      ),
      tableOfContentsEntryToHeader(apiHeader),
      para(
        'Import the Scene namespace: ',
        inlineCode("import { Scene } from 'foldkit'"),
        '. It has three kinds of functions: locators that find elements by accessible attributes, interactions that exercise the view, and assertions that check the rendered HTML.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.sceneApiHighlighted)], []),
        Snippets.sceneApiRaw,
        'Copy Scene API reference to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(locatorsHeader),
      para(
        'Locators find elements the way users find them: by role, by label, by visible text. Each factory returns a ',
        inlineCode('Locator'),
        ' that resolves to a single match; interactions and assertions accept either a Locator or a raw CSS selector string.',
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
            ['Elements by data-testid — the escape hatch for tests.'],
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
      para(
        inlineCode('Scene.role'),
        ' accepts a second argument of state options that narrow the match. All options are optional:',
      ),
      comparisonTable(
        ['Option', 'Type', 'Matches'],
        [
          [
            [plainCode('name')],
            [plainCode('string')],
            [
              'Accessible name (aria-label, aria-labelledby, label[for], or text content)',
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
        ' scopes a whole block of steps — every assertion or interaction inside the block resolves within the parent\u2019s subtree. Use ',
        inlineCode('within'),
        ' for one-off scoped queries; use ',
        inlineCode('inside'),
        ' when several steps share the same scope. Nested ',
        inlineCode('inside'),
        ' calls compose.',
      ),
      para(
        'For lists and repeated elements, the ',
        inlineCode('Scene.all.*'),
        ' factories (',
        inlineCode('Scene.all.role'),
        ', ',
        inlineCode('Scene.all.text'),
        ', ',
        inlineCode('Scene.all.label'),
        ', and so on — one per single-match factory) return a ',
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
      para(
        'This is the clean way to say \u201Cthe row that contains Alice\u201D: ',
        inlineCode(
          "Scene.first(Scene.filter(Scene.all.role('row'), { hasText: 'Alice' }))",
        ),
        '.',
      ),
      tableOfContentsEntryToHeader(interactionsHeader),
      para(
        'Interactions exercise the view by invoking event handlers on matched elements. Each one captures the dispatched Message, feeds it through update, and re-renders. They accept either a Locator or a CSS selector string.',
      ),
      comparisonTable(
        ['Step', 'Invokes'],
        [
          [[plainCode('Scene.click(target)')], [plainCode('OnClick')]],
          [[plainCode('Scene.doubleClick(target)')], [plainCode('OnDblClick')]],
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
              ' with the given value — for ',
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
        ' runs a function for side effects (like ad-hoc assertions on raw VNodes or the captured outMessages) without breaking the step chain.',
      ),
      tableOfContentsEntryToHeader(assertionsHeader),
      para(
        inlineCode('Scene.expect(locator)'),
        ' creates an inline assertion step against a single element. Every matcher has a ',
        inlineCode('.not'),
        ' variant that inverts the assertion.',
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
      tableOfContentsEntryToHeader(submodelsHeader),
      para(
        'Submodel views have the signature ',
        inlineCode('(model, toParentMessage) => Html'),
        ', but ',
        inlineCode('Scene.scene'),
        ' expects ',
        inlineCode('(model) => Html'),
        '. ',
        inlineCode('Scene.childView(view)'),
        ' bridges this by fixing the adapter to identity, so the child\u2019s Messages go straight to its own update. Use it whenever you Scene-test a Submodel view in isolation: ',
        inlineCode('Scene.scene({ update, view: Scene.childView(view) }, ...)'),
        '.',
      ),
      tableOfContentsEntryToHeader(exampleHeader),
      para(
        'Here\u2019s a Scene test for a weather app. The user types a zip code, submits the form, sees a loading state, and then the forecast appears:',
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
