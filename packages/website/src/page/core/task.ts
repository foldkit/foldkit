import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { apiModuleRouter, coreCommandsRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whatTasksAreHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-tasks-are-and-are-not',
  text: 'What Tasks are (and are not)',
}

const usingTasksHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'using-tasks',
  text: 'Using Tasks',
}

const fullApiSurfaceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'full-api-surface',
  text: 'Full API surface',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whatTasksAreHeader,
  usingTasksHeader,
  fullApiSurfaceHeader,
]

const taskApiHref = apiModuleRouter({ moduleSlug: 'task' })

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/task', 'Task'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('Task'),
        ' module is a small set of utility functions that wrap the most common browser side effects as Effects: getting the current time, generating a random integer, focusing an element, locking page scroll, waiting for an animation to settle. You use them inside your own ',
        link(coreCommandsRouter(), 'Commands'),
        '.',
      ),
      para(
        'Tasks exist so every Foldkit app reaches for the same wrapper when it needs the time or a UUID. That consistency keeps DevTools traces, scene tests, and example code reading the same way across projects.',
      ),
      tableOfContentsEntryToHeader(whatTasksAreHeader),
      para(
        'A Task is just an Effect. ',
        inlineCode('Task.getTime'),
        ' is an ',
        inlineCode('Effect.Effect<DateTime.Utc>'),
        '. ',
        inlineCode('Task.focus'),
        ' returns an ',
        inlineCode('Effect.Effect<void, ElementNotFound>'),
        '. There is no special Task type, no separate runtime hook, no registration step. The runtime sees only Commands. Tasks are the Effects you choose to put inside them.',
      ),
      para(
        'Tasks are not the only way to write a Command. Any Effect works. If you have your own ',
        inlineCode('HttpClient'),
        ' call, your own ',
        inlineCode('localStorage'),
        ' wrapper, or a third-party Effect, drop it straight into ',
        inlineCode('Command.define'),
        '. Reach for a Task when one exists for what you need. Write your own Effect when one does not.',
      ),
      para(
        'Tasks are not a runtime feature. They cannot do anything that a plain Effect cannot. The runtime has no opinion about whether the Effect inside your Command came from ',
        inlineCode('Task'),
        ' or from somewhere else.',
      ),
      para(
        'Tasks are not a parallel concept to Messages, Models, or Subscriptions. Those are architectural roles. Task is a utility namespace.',
      ),
      tableOfContentsEntryToHeader(usingTasksHeader),
      para(
        'Wrap a Task in a Command at the call site. The Task produces a value (a ',
        inlineCode('DateTime'),
        ', a ',
        inlineCode('number'),
        ', a UUID), and you map that value into one of your Messages.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.taskGetTimeHighlighted)], []),
        Snippets.taskGetTimeRaw,
        'Copy task time examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Tasks that touch the DOM can fail. ',
        inlineCode('Task.focus'),
        ' and ',
        inlineCode('Task.scrollIntoView'),
        ' fail with ',
        inlineCode('ElementNotFound'),
        ' when the selector does not match. ',
        inlineCode('Task.getZonedTimeIn'),
        ' fails with ',
        inlineCode('TimeZoneError'),
        ' on an invalid zone ID. Catch the failure with ',
        inlineCode('Effect.catch'),
        ' and turn it into a Message, or ignore it with ',
        inlineCode('Effect.ignore'),
        ' when the failure is not interesting (a stale focus call after the user has navigated away).',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.taskFocusHighlighted)], []),
        Snippets.taskFocusRaw,
        'Copy task focus example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(fullApiSurfaceHeader),
      para(
        'The Task module covers time and timezones, DOM focus and scrolling, animation timing, randomness, and scroll lock. The ',
        link(taskApiHref, 'Task API reference'),
        ' lists every function with its signature and an inline example, generated directly from the source.',
      ),
      para(
        'When you need a side effect that Task does not cover, write the Effect yourself and wrap it in a Command. Tasks are shared shortcuts, not a fence around what is allowed.',
      ),
    ],
  )
