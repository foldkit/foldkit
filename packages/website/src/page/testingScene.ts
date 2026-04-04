import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

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
        'Locators find elements the way users find them: by role, label, text, or placeholder. ',
        inlineCode('Scene.role'),
        ' matches ARIA roles, both explicit and implicit. A ',
        inlineCode('<button>'),
        ' has implicit role ',
        inlineCode('button'),
        '. ',
        inlineCode('Scene.label'),
        ' checks ',
        inlineCode('aria-label'),
        ' and ',
        inlineCode('<label>'),
        ' associations. ',
        inlineCode('Scene.text'),
        ' finds elements by their text content. ',
        inlineCode('Scene.selector'),
        ' is the CSS escape hatch for elements without accessible attributes.',
      ),
      para(
        inlineCode('Scene.within'),
        ' scopes a locator to a parent element. When the view has repeated structures like columns or card lists, ',
        inlineCode(
          "Scene.within(Scene.role('region', { name: 'Sidebar' }), Scene.role('link'))",
        ),
        ' finds the link inside the sidebar, not elsewhere on the page. ',
        inlineCode('within'),
        ' also composes in pipe chains as a data-last function.',
      ),
      tableOfContentsEntryToHeader(interactionsHeader),
      para(
        'Interactions accept either a CSS selector string or a Locator. ',
        inlineCode('Scene.click'),
        ' invokes the element\u2019s ',
        inlineCode('OnClick'),
        ' handler. ',
        inlineCode('Scene.type'),
        ' invokes ',
        inlineCode('OnInput'),
        '. ',
        inlineCode('Scene.submit'),
        ' invokes ',
        inlineCode('OnSubmit'),
        '. Each one captures the dispatched Message, feeds it through update, and re-renders the view.',
      ),
      para(
        inlineCode('Scene.keydown'),
        ' invokes ',
        inlineCode('OnKeyDown'),
        ' or ',
        inlineCode('OnKeyDownPreventDefault'),
        ' with an optional modifiers object (',
        inlineCode('{ shiftKey, ctrlKey, altKey, metaKey }'),
        '). ',
        inlineCode('Scene.tap'),
        ' runs a function for side effects (like assertions on raw VNodes or outMessages) without breaking the step chain.',
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
      tableOfContentsEntryToHeader(assertionsHeader),
      para(
        inlineCode('Scene.expect'),
        ' creates inline assertion steps that check the rendered HTML without breaking the pipeline. Existence matchers: ',
        inlineCode('.toExist()'),
        ' and ',
        inlineCode('.toBeAbsent()'),
        '. Text matchers: ',
        inlineCode('.toHaveText()'),
        ' and ',
        inlineCode('.toContainText()'),
        '. State matchers: ',
        inlineCode('.toBeDisabled()'),
        ', ',
        inlineCode('.toBeEnabled()'),
        ', ',
        inlineCode('.toBeChecked()'),
        ', and ',
        inlineCode('.toHaveValue()'),
        '. Attribute matchers: ',
        inlineCode('.toHaveAttr()'),
        ', ',
        inlineCode('.toHaveClass()'),
        ', and ',
        inlineCode('.toHaveStyle()'),
        '. Every matcher has a ',
        inlineCode('.not'),
        ' variant.',
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
