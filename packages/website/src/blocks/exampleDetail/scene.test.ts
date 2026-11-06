import { Array, Option, pipe } from 'effect'
import { Calendar, Scene, Url } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

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
    Scene.scene(
      application,
      Scene.init(flags, url),
      resolveBrowserStartup(flags),
      resolveApiData,
      Scene.Mount.resolve(
        MeasureSnippetHeight({
          snippetId: 'example-ssr-source-src/application.ts',
        }),
        SnippetDisclosureBlock.Message.CompletedMeasureSnippetHeight({
          snippetId: 'example-ssr-source-src/application.ts',
          snippetSize: SnippetSize.Overflows(),
        }),
      ),
      Scene.click(
        Scene.within(
          Scene.role('tabpanel', { name: /application\.ts$/ }),
          Scene.role('button', { name: 'Show code' }),
        ),
      ),
      Scene.expect(
        Scene.within(
          Scene.role('tabpanel', { name: /application\.ts$/ }),
          Scene.role('button', { name: 'Hide code' }),
        ),
      ).toExist(),
      Scene.click(Scene.role('tab', { name: /entry\.server\.ts$/ })),
      Scene.expect(
        Scene.role('tab', { name: /entry\.server\.ts$/ }),
      ).toHaveAttr('aria-selected', 'true'),
      Scene.Command.resolve(
        Tabs.test.FocusTab,
        SourceFileTabsBlock.Message.CompletedFocusTab(),
      ),
      Scene.expect(
        Scene.within(
          Scene.role('tabpanel', { name: /entry\.server\.ts$/ }),
          Scene.role('button', { name: 'Hide code' }),
        ),
      ).toExist(),
    ),
  )
})
