import { Array, Option, pipe } from 'effect'
import { Calendar, Url } from 'foldkit'
import {
  Command,
  Mount,
  click,
  expect,
  init,
  role,
  scene,
  within,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { test as TabsTest } from '@foldkit/ui/tabs'

import { SnippetDisclosureBlock } from '..'
import { Deployment } from '../../deployment'
import { ApplicationBlock, layer } from '../../index'
import { resolveApiData, resolveBrowserStartup } from '../../scene.fixture'
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

describe('example detail', () => {
  it.effect('source files share their code disclosure state', () =>
    scene(
      application,
      init(flags, url),
      resolveBrowserStartup(flags),
      resolveApiData,
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
    ),
  )
})
