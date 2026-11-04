import { Array, Effect, Option, pipe } from 'effect'
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
import { type TestBlock, withBlock } from 'foldkit/story'
import { describe, test } from 'vitest'

import { test as TabsTest } from '@foldkit/ui/tabs'

import { SnippetDisclosureBlock } from '..'
import { ApplicationBlock, layer } from '../../block'
import { Deployment } from '../../deployment'
import { SnippetSize } from '../snippetDisclosure/model'
import { MeasureSnippetHeight } from '../snippetDisclosure/mount'
import { SourceFileTabsBlock } from './fileTabs'
import { type ExampleSources } from './sources'

const application = { block: ApplicationBlock, layer }

const longCode = pipe(
  Array.makeBy(16, index => `const value${index} = ${index}`),
  Array.join('\n'),
)
const applicationCode = `const application = true\n${longCode}`
const serverCode = `const entryServer = true\n${longCode}`

const sources: ExampleSources = {
  files: [
    {
      path: 'src/application.ts',
      highlightedHtml: `<pre><code>${applicationCode}</code></pre>`,
      rawCode: applicationCode,
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

const makeFixture = (block: TestBlock<typeof application>) => {
  const init = block.init
  const update = block.update
  const view = block.view

  return { block, init, update, view }
}

describe('example detail', () => {
  test('source files share their code disclosure state', async () => {
    await Effect.runPromise(
      withBlock(application, executable => {
        const { init, update, view } = makeFixture(executable)

        scene(
          { update, view },
          given(init(flags, url).model),
          Mount.resolve(
            MeasureSnippetHeight({
              snippetId: 'example-ssr-source-src/application.ts',
            }),
            SnippetDisclosureBlock.Message.CompletedMeasureSnippetHeight({
              snippetId: 'example-ssr-source-src/application.ts',
              snippetSize: SnippetSize.Overflows(),
            }),
          ),
          click(
            within(
              role('tabpanel', { name: /application\.ts$/ }),
              role('button', { name: 'Show code' }),
            ),
          ),
          expect(
            within(
              role('tabpanel', { name: /application\.ts$/ }),
              role('button', { name: 'Hide code' }),
            ),
          ).toExist(),
          click(role('tab', { name: /entry\.server\.ts$/ })),
          expect(role('tab', { name: /entry\.server\.ts$/ })).toHaveAttr(
            'aria-selected',
            'true',
          ),
          Command.resolve(
            TabsTest.FocusTab,
            SourceFileTabsBlock.Message.CompletedFocusTab(),
          ),
          expect(
            within(
              role('tabpanel', { name: /entry\.server\.ts$/ }),
              role('button', { name: 'Hide code' }),
            ),
          ).toExist(),
        )
      }),
    )
  })
})
