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
import { testingSceneRouter, testingStoryRouter } from '../route'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

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
  storyHeader,
  sceneHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('testing', 'Testing'),
      para(
        'The Elm Architecture makes testing straightforward. The update function is pure. Given a Model and a Message, it always returns the same result. No DOM, no HTTP calls, no timers. Just a function that takes data and returns data.',
      ),
      para(
        'Foldkit ships two testing primitives. ',
        inlineCode('Story'),
        ' tests the state machine \u2014 you send Messages directly through update, resolve Commands inline, and assert on the Model. ',
        inlineCode('Scene'),
        ' tests features through the rendered view \u2014 clicking buttons, typing into inputs, pressing keys \u2014 using accessible locators. Both are pure, deterministic, and fast.',
      ),
      tableOfContentsEntryToHeader(storyHeader),
      para(
        inlineCode('Story.story'),
        ' simulates the update loop. Each step reads like a sentence: send a Message, resolve a Command, check the Model. See the ',
        link(testingStoryRouter(), 'Story'),
        ' page for the full API.',
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
        ' exercises the view. Locators find elements the way users do \u2014 by role, label, or placeholder. Interactions dispatch Messages through the rendered event handlers. Inline assertions check the HTML between steps. See the ',
        link(testingSceneRouter(), 'Scene'),
        ' page for the full API.',
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
      para(
        'Use Story for update logic, edge cases, and Command wiring. Use Scene for user flows, view rendering, and accessibility. A well-tested Foldkit app uses both.',
      ),
    ],
  )
