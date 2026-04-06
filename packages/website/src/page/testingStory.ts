import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { coreCommandsRouter } from '../route'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

const whyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing-the-update-loop',
  text: 'Testing the Update Loop',
}

const apiHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-api',
  text: 'The API',
}

const simpleExampleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'your-first-test',
  text: 'Your First Test',
}

const multiStepHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'multi-step-flows',
  text: 'Multi-Step Flows',
}

const commandEffectsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing-side-effects',
  text: 'Testing Side Effects',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  whyHeader,
  apiHeader,
  simpleExampleHeader,
  multiStepHeader,
  commandEffectsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('testing-story', 'Story'),
      tableOfContentsEntryToHeader(whyHeader),
      para(
        'The Elm Architecture makes testing straightforward. The update function is pure. Given a Model and a Message, it always returns the same result. No DOM, no HTTP calls, no timers. Just a function that takes data and returns data.',
      ),
      para(
        inlineCode('Story'),
        ' tests the state machine. You send Messages through update, resolve Commands inline, and assert on the Model. The entire test is one ',
        inlineCode('Story.story'),
        ' call. No mocking libraries, no fake timers, no setup or teardown.',
      ),
      tableOfContentsEntryToHeader(apiHeader),
      para(
        'Import the Story namespace: ',
        inlineCode("import { Story } from 'foldkit'"),
        '. It exports eleven functions: ',
        inlineCode('story'),
        ', ',
        inlineCode('with'),
        ', ',
        inlineCode('message'),
        ', ',
        inlineCode('resolve'),
        ', ',
        inlineCode('resolveAll'),
        ', ',
        inlineCode('model'),
        ', ',
        inlineCode('expectHasCommands'),
        ', ',
        inlineCode('expectExactCommands'),
        ', ',
        inlineCode('expectNoCommands'),
        ', ',
        inlineCode('expectOutMessage'),
        ', and ',
        inlineCode('expectNoOutMessage'),
        '.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.testingApiHighlighted)], []),
        Snippets.testingApiRaw,
        'Copy API reference to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(simpleExampleHeader),
      para(
        'Here\u2019s a test for the delayed reset from the ',
        link(coreCommandsRouter(), 'Commands'),
        ' page. When the user clicks reset, a one-second delay fires, then the count resets to zero:',
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
        'Copy simple test example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The test reads as a story. Start from a Model with count 5. Send ',
        inlineCode('ClickedResetAfterDelay()'),
        '. Verify that update returned a ',
        inlineCode('DelayReset'),
        ' Command. Resolve it with ',
        inlineCode('DelayedReset()'),
        '. Verify the count is 0. Every step is visible. The simulation called update, resolved the Command with the Message you provided, fed that Message back through update, and arrived at the final state.',
      ),
      tableOfContentsEntryToHeader(multiStepHeader),
      para(
        'Real apps have multi-step user stories. ',
        inlineCode('Story.resolve'),
        ' and ',
        inlineCode('Story.resolveAll'),
        ' let you resolve Commands inline at any point in the story. This keeps the resolution next to the step that produced the Command, so the test reads chronologically:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.testingWeatherFlowHighlighted)],
          [],
        ),
        Snippets.testingWeatherFlowRaw,
        'Copy multi-step test example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Every ',
        inlineCode('Story.message'),
        ' is a user action: \u201Cthe user submitted the form.\u201D Every ',
        inlineCode('Story.resolve'),
        ' or ',
        inlineCode('Story.resolveAll'),
        ' is world-building: \u201Cthe weather API succeeded.\u201D Every ',
        inlineCode('Story.model'),
        ' is a scene check: \u201Cthe weather is showing.\u201D',
      ),
      infoCallout(
        'Unresolved Commands',
        inlineCode('Story.message'),
        ' throws if there are pending Commands from a previous step \u2014 resolve all Commands before sending the next Message. ',
        inlineCode('Story.story'),
        ' throws at the end if any Commands remain unresolved. Every Command your update function produces must be accounted for.',
      ),
      tableOfContentsEntryToHeader(commandEffectsHeader),
      para(
        'The simulation tests the state machine. Messages go in, Model changes come out, Commands are resolved declaratively. It does not run the actual Effects inside Commands.',
      ),
      para(
        'To test that a Command\u2019s Effect works correctly (for example, that an HTTP request parses the response right), test it separately with ',
        inlineCode('Effect.provide'),
        ' and a mock service layer:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.testingCommandEffectHighlighted),
          ],
          [],
        ),
        Snippets.testingCommandEffectRaw,
        'Copy Command Effect test example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Two levels, clean separation. The simulation proves the state machine wires correctly. ',
        inlineCode('Effect.provide'),
        ' proves the side effect works. If the state machine sends the right Command, and the Command does the right thing, the program works.',
      ),
    ],
  )
