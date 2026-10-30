import { Option } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { test as TabsTest } from '@foldkit/ui/tabs'

import { ExampleDetailLive } from './block'
import { LoadExampleSources } from './example'
import { SourceFileTabs } from './fileTabs'
import { Message } from './message'
import type { ExampleSources } from './sources'

const sources: ExampleSources = {
  files: [
    {
      path: 'src/application.ts',
      highlightedHtml: '<pre><code>const application = true</code></pre>',
      rawCode: 'const application = true',
    },
  ],
}

const args = (
  maybeInitialSlug: Option.Option<string>,
  maybeExampleSources: Option.Option<ExampleSources> = Option.none(),
) => ({ maybeInitialSlug, maybeExampleSources })

const idleFields = {
  maybeActiveSourceFilePath: Option.none(),
  maybeExampleUrl: Option.none(),
  isLivePreviewOpen: true,
  currentSources: { _tag: 'Idle' },
}

describe('example detail initial sources', () => {
  it.effect(
    'initializes idle when there is no initial slug, ignoring supplied sources',
    () =>
      story(
        ExampleDetailLive,
        args(Option.none(), Option.some(sources)),
        model(model => {
          expect(model).toMatchObject(idleFields)
        }),
        Command.expectNone(),
      ),
  )

  it.effect('initializes an available unseeded example in Loading', () =>
    story(
      ExampleDetailLive,
      args(Option.some('counter')),
      model(model => {
        expect(model.currentSources._tag).toBe('Loading')
        expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
        expect(model.maybeExampleUrl).toEqual(Option.none())
      }),
    ),
  )

  it.effect('initializes supplied sources as Success', () =>
    story(
      ExampleDetailLive,
      args(Option.some('counter'), Option.some(sources)),
      model(model => {
        expect(model.currentSources).toEqual({ _tag: 'Success', data: sources })
        expect(model.maybeActiveSourceFilePath).toEqual(
          Option.some('src/application.ts'),
        )
      }),
    ),
  )

  it.effect(
    'initializes an empty supplied source list without a selected file',
    () => {
      const emptySources: ExampleSources = { files: [] }

      return story(
        ExampleDetailLive,
        args(Option.some('counter'), Option.some(emptySources)),
        model(model => {
          expect(model.currentSources).toEqual({
            _tag: 'Success',
            data: emptySources,
          })
          expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
        }),
      )
    },
  )

  it.effect(
    'initializes unavailable examples as idle with or without supplied sources',
    () =>
      story(
        ExampleDetailLive,
        args(Option.some('livestore'), Option.some(sources)),
        model(model => {
          expect(model).toMatchObject(idleFields)
        }),
      ),
  )

  it.effect(
    'route changes reset existing source and child state before loading',
    () => {
      const initialTabs: Array<unknown> = []

      return story(
        ExampleDetailLive,
        args(Option.some('counter'), Option.some(sources)),
        model(model => {
          initialTabs.push(model.sourceFileTabs)
        }),
        message(
          Block.deliver(
            SourceFileTabs,
            ['sourceFileTabs', 'counter'],
            SourceFileTabs.Message.FocusedTab({ index: 2 }),
          ),
        ),
        Command.resolve(
          TabsTest.FocusTab,
          SourceFileTabs.Message.CompletedFocusTab(),
        ),
        model(model => {
          expect(model.sourceFileTabs).not.toEqual(initialTabs[0])
        }),
        message(Message.ChangedExampleUrl({ url: 'https://example.test' })),
        message(Message.InformedOfRouteChange({ slug: 'counters' })),
        model(model => {
          expect(model.currentSources._tag).toBe('Loading')
          expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
          expect(model.maybeExampleUrl).toEqual(Option.none())
          expect(model.sourceFileTabs).toEqual(initialTabs[0])
        }),
        Command.expectExact(LoadExampleSources),
        Command.resolve(
          LoadExampleSources,
          Message.SucceededLoadExampleSources({ sources }),
        ),
      )
    },
  )

  it.effect(
    'clears existing sources when routing to an unavailable example',
    () =>
      story(
        ExampleDetailLive,
        args(Option.some('counter'), Option.some(sources)),
        message(Message.ChangedExampleUrl({ url: 'https://example.test' })),
        message(Message.InformedOfRouteChange({ slug: 'livestore' })),
        model(model => {
          expect(model).toMatchObject(idleFields)
        }),
        Command.expectNone(),
      ),
  )
})
