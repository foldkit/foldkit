import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const crashReportHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'crash-report',
  text: 'Crash Reporting',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  crashReportHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/crash-view', 'Crash View'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'When Foldkit hits an unrecoverable error during ',
        inlineCode('update'),
        ', ',
        inlineCode('view'),
        ', or Command execution, it stops all processing and renders a fallback UI. This is not error handling. There is no recovery from this state. The runtime is dead.',
      ),
      para(
        'By default, Foldkit shows a built-in crash screen with the error message and a reload button. Pass a ',
        inlineCode('crash.view'),
        ' function to ',
        inlineCode('makeProgram'),
        ' to customize it. It receives a ',
        inlineCode('CrashContext'),
        ' containing the ',
        inlineCode('error'),
        ', the ',
        inlineCode('model'),
        ' at the time of the crash, and the ',
        inlineCode('message'),
        ' being processed:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.crashViewCustomHighlighted)],
          [],
        ),
        Snippets.crashViewCustomRaw,
        'Custom crash view example',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Call ',
        inlineCode('html<never>()'),
        ' with ',
        inlineCode('never'),
        ' as the type parameter. Since the runtime has stopped, no Messages will ever be dispatched. ',
        inlineCode('never'),
        ' makes this explicit and prevents event handlers like ',
        inlineCode('OnClick'),
        ' from being used.',
      ),
      para(
        'Foldkit\u2019s event handlers like ',
        inlineCode('OnClick'),
        ' work by dispatching Messages to the runtime. Since the runtime has stopped, those handlers are silently ignored. For interactivity, like a reload button, use ',
        inlineCode("Attribute('onclick', 'location.reload()')"),
        '. This sets a raw DOM event handler directly on the element, bypassing Foldkit\u2019s dispatch system entirely.',
      ),
      infoCallout(
        'Only in crash.view',
        'In a normal Foldkit app, always use ',
        inlineCode('OnClick'),
        ' with Messages, never raw DOM event attributes. ',
        inlineCode('crash.view'),
        ' is the one exception because the runtime is no longer running.',
      ),
      para(
        'If your custom ',
        inlineCode('crash.view'),
        ' itself throws an error, Foldkit catches it and falls back to the default crash screen showing both the original error and the ',
        inlineCode('crash.view'),
        ' error.',
      ),
      tableOfContentsEntryToHeader(crashReportHeader),
      para(
        'Use ',
        inlineCode('crash.report'),
        ' to run side effects when the app crashes, like sending the error to Sentry or another logging service. It receives the same ',
        inlineCode('CrashContext'),
        ' as ',
        inlineCode('crash.view'),
        ', giving you access to the error, Model, and Message:',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.crashReportHighlighted)], []),
        Snippets.crashReportRaw,
        'Crash reporting example',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('crash.report'),
        ' is a synchronous callback. The runtime is dead at this point, so there is no Effect runtime to schedule work on. If you need async behavior (like flushing a logging buffer), fire it from within the callback yourself.',
      ),
      para(
        inlineCode('crash.report'),
        ' runs before ',
        inlineCode('crash.view'),
        ' renders. If ',
        inlineCode('crash.report'),
        ' throws, Foldkit catches the error, logs it to the console, and continues rendering the crash view.',
      ),
      para(
        'See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'crash-view' }),
          'crash-view example',
        ),
        ' for a working demonstration.',
      ),
      para(
        'The next two pages cover how Foldkit warns you about slow views during development and how to memoize expensive subtrees.',
      ),
    ],
  )
