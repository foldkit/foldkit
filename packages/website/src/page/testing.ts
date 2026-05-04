import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  patternsSubmodelsRouter,
  testingSceneRouter,
  testingStoryRouter,
} from '../route'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const storyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'story',
  text: 'Story',
}

const sceneHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scene',
  text: 'Scene',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  storyHeader,
  sceneHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('testing', 'Testing'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The Elm Architecture makes testing straightforward. The update function is pure. Given a Model and a Message, it always returns the same result. No DOM, no HTTP calls, no timers. Just a function that takes data and returns data.',
      ),
      para(
        'Foldkit ships two testing primitives. ',
        inlineCode('Story'),
        ' tests the state machine: you send Messages directly through update, resolve Commands inline, and assert on the Model. ',
        inlineCode('Scene'),
        ' tests features through the rendered view (clicking buttons, typing into inputs, pressing keys) using accessible locators. Both are pure, deterministic, and fast.',
      ),
      para(
        'Use Story for update logic, edge cases, and Command wiring. Use Scene for user flows, view rendering, and accessibility. A well-tested Foldkit app uses both.',
      ),
      tableOfContentsEntryToHeader(storyHeader),
      para(
        inlineCode('Story.story'),
        ' simulates the update loop. Each step reads like a sentence: send a Message, resolve a Command, check the Model. See the ',
        link(testingStoryRouter(), 'Story'),
        ' page for the full API.',
      ),
      para(
        'Story tests are flexible about testing level. Because Story sends Messages directly to ',
        inlineCode('update'),
        ' and asserts on the Model, testing a child\u2019s update in isolation is valid: the function signature is the contract, and it works the same whether the parent calls it or the test does.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterCommandsTestHighlighted),
          ],
          [],
        ),
        Snippets.counterCommandsTestRaw,
        'Copy Story example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(sceneHeader),
      para(
        inlineCode('Scene.scene'),
        ' exercises the view. Locators find elements the way users do: by role, label, or placeholder. Interactions dispatch Messages through the rendered event handlers. Inline assertions check the HTML between steps. Scene also tracks the Mount lifecycle: the side effects declared by ',
        inlineCode('OnMount'),
        ' attributes in the view must be acknowledged via ',
        inlineCode('Scene.Mount.resolve'),
        ', mirroring how Commands are resolved. See the ',
        link(testingSceneRouter(), 'Scene'),
        ' page for the full API.',
      ),
      para(
        'Scene tests should always run from the root ',
        inlineCode('update'),
        ' and ',
        inlineCode('view'),
        '. In a ',
        link(patternsSubmodelsRouter(), 'Submodel'),
        ' app, only the root view has the ',
        inlineCode('(model) => Html'),
        ' signature that ',
        inlineCode('Scene.scene'),
        ' expects. Every level below takes a ',
        inlineCode('toParentMessage'),
        ' adapter. Testing a child view in isolation means inventing a code path that never runs in production: the parent\u2019s Command mapping, OutMessage handling, and Model transitions would all be invisible. Test what users see, through the same code path they use.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.sceneWeatherFlowHighlighted)],
          [],
        ),
        Snippets.sceneWeatherFlowRaw,
        'Copy Scene example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
    ],
  )
