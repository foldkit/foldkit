import { Array, Option, pipe } from 'effect'
import { Calendar, Url } from 'foldkit'
import {
  Command,
  Mount,
  click,
  expect,
  given,
  role,
  scene,
  within,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import { Deployment } from '../../deployment'
import { init, update, view } from '../../main'
import { Message } from '../../message'
import * as SnippetDisclosure from '../../snippetDisclosure'
import { type ExampleSources } from './sources'

const longCode = pipe(
  Array.makeBy(16, index => `const value${index} = ${index}`),
  Array.join('\n'),
)
const mainCode = `const main = true\n${longCode}`
const serverCode = `const entryServer = true\n${longCode}`

const sources: ExampleSources = {
  files: [
    {
      path: 'src/main.ts',
      highlightedHtml: `<pre><code>${mainCode}</code></pre>`,
      rawCode: mainCode,
    },
    {
      path: 'src/entry.server.ts',
      highlightedHtml: `<pre><code>${serverCode}</code></pre>`,
      rawCode: serverCode,
    },
  ],
}

const url = pipe(
  Url.fromString('https://foldkit.dev/example-apps/ssr'),
  Option.getOrThrow,
)
const flags = {
  currentYear: 2026,
  today: Calendar.make(2026, 8, 30),
  deployment: Deployment.Production(),
  maybeApiData: Option.none(),
  maybeExampleSources: Option.some(sources),
}

describe('example detail', () => {
  test('source files share their code disclosure state', () => {
    scene(
      { update, view },
      given(init(flags, url).model),
      Mount.resolve(
        SnippetDisclosure.MeasureSnippetHeight({
          snippetId: 'example-ssr-source-src/main.ts',
        }),
        Message.GotSnippetDisclosureMessage({
          message: SnippetDisclosure.Message.CompletedMeasureSnippetHeight({
            snippetId: 'example-ssr-source-src/main.ts',
            snippetSize: SnippetDisclosure.SnippetSize.Overflows(),
          }),
        }),
      ),
      click(
        within(
          role('tabpanel', { name: /main\.ts$/ }),
          role('button', { name: 'Show code' }),
        ),
      ),
      expect(
        within(
          role('tabpanel', { name: /main\.ts$/ }),
          role('button', { name: 'Hide code' }),
        ),
      ).toExist(),
      click(role('tab', { name: /entry\.server\.ts$/ })),
      expect(role('tab', { name: /entry\.server\.ts$/ })).toHaveAttr(
        'aria-selected',
        'true',
      ),
      Command.resolve(Tabs.FocusTab, Tabs.Message.CompletedFocusTab()),
      expect(
        within(
          role('tabpanel', { name: /entry\.server\.ts$/ }),
          role('button', { name: 'Hide code' }),
        ),
      ).toExist(),
    )
  })
})
