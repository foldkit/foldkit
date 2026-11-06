import { Effect, type Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { SourceFileTabsBinding } from './composition'
import { LoadExampleSources, Message } from './example'
import { SourceFileTabsBlock } from './fileTabs'
import { InMessage } from './inMessage'
import { ExampleDetailBlock, layer } from './index'
import type { ExampleSources } from './sources'

const exampleDetailSubject = { block: ExampleDetailBlock, layer }

const sources: ExampleSources = {
  files: [
    {
      path: 'src/application.ts',
      highlightedHtml: '<pre><code>const application = true</code></pre>',
      rawCode: 'const application = true',
    },
  ],
}

const failedSources = Message.FailedLoadExampleSources({ error: 'Offline' })

describe('example detail initial sources', () => {
  it.effect(
    'initializes idle when there is no initial slug, ignoring supplied sources',
    () =>
      Effect.gen(function* () {
        const initialModel = yield* Story.story(
          exampleDetailSubject,
          Story.init(),
          Story.model(model => {
            expect(model.currentSources._tag).toBe('Idle')
            expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
          }),
          Story.Command.expectNone(),
        )

        yield* Story.story(
          exampleDetailSubject,
          Story.init(Option.none(), Option.some(sources)),
          Story.model(model => expect(model).toEqual(initialModel)),
          Story.Command.expectNone(),
        )
      }),
  )

  it.effect(
    'initializes an available unseeded example in Loading with its Command',
    () => {
      expectTypeOf<
        Layer.Services<
          Story.TestBlock<typeof exampleDetailSubject>['EffectsLayer']
        >
      >().toEqualTypeOf<never>()

      return Story.story(
        exampleDetailSubject,
        Story.init(Option.some('counter')),
        Story.model(model => {
          expect(model.currentSources._tag).toBe('Loading')
          expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
          expect(model.maybeExampleUrl).toEqual(Option.none())
          expect(model.sourceFileTabs).toEqual(
            SourceFileTabsBlock.Model.make({
              id: 'source-file-tabs',
              maybeFocusedIndex: Option.none(),
              activationMode: 'Automatic',
            }),
          )
        }),
        Story.Command.expectExact(LoadExampleSources({ slug: 'counter' })),
        Story.Command.resolve(LoadExampleSources, failedSources),
      )
    },
  )

  it.effect(
    'creates independent Tabs Models for repeated initializations',
    () =>
      Effect.gen(function* () {
        const firstModel = yield* Story.story(
          exampleDetailSubject,
          Story.init(Option.some('counter')),
          Story.model(model => {
            expect(model.sourceFileTabs).toEqual(
              SourceFileTabsBlock.Model.make({
                id: 'source-file-tabs',
                maybeFocusedIndex: Option.none(),
                activationMode: 'Automatic',
              }),
            )
          }),
          Story.Command.resolve(LoadExampleSources, failedSources),
        )

        yield* Story.story(
          exampleDetailSubject,
          Story.init(Option.some('counter')),
          Story.model(model => {
            expect(model.sourceFileTabs).toEqual(firstModel.sourceFileTabs)
            expect(model.sourceFileTabs).not.toBe(firstModel.sourceFileTabs)
          }),
          Story.Command.resolve(LoadExampleSources, failedSources),
        )
      }),
  )

  it.effect(
    'initializes supplied sources as Success without fetching them',
    () =>
      Story.story(
        exampleDetailSubject,
        Story.init(Option.some('counter'), Option.some(sources)),
        Story.model(model => {
          expect(model.currentSources).toEqual({
            _tag: 'Success',
            data: sources,
          })
          expect(model.maybeActiveSourceFilePath).toEqual(
            Option.some('src/application.ts'),
          )
        }),
        Story.Command.expectNone(),
      ),
  )

  it.effect(
    'initializes an empty supplied source list without a selected file',
    () => {
      const emptySources: ExampleSources = { files: [] }

      return Story.story(
        exampleDetailSubject,
        Story.init(Option.some('counter'), Option.some(emptySources)),
        Story.model(model => {
          expect(model.currentSources).toEqual({
            _tag: 'Success',
            data: emptySources,
          })
          expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect(
    'initializes unavailable examples as idle with or without supplied sources',
    () =>
      Effect.gen(function* () {
        const baseline = yield* Story.story(
          exampleDetailSubject,
          Story.init(),
          Story.Command.expectNone(),
        )

        for (const maybeSources of [
          Option.none<ExampleSources>(),
          Option.some(sources),
        ]) {
          yield* Story.story(
            exampleDetailSubject,
            Story.init(Option.some('livestore'), maybeSources),
            Story.model(model => expect(model).toEqual(baseline)),
            Story.Command.expectNone(),
          )
        }
      }),
  )

  it.effect(
    'route changes reset existing source and child state before loading',
    () =>
      Story.story(
        exampleDetailSubject,
        Story.init(Option.some('counter'), Option.some(sources)),
        Story.messageIn(
          SourceFileTabsBinding,
          SourceFileTabsBlock.Message.FocusedTab({ index: 2 }),
        ),
        Story.Command.resolve(
          Tabs.test.FocusTab,
          SourceFileTabsBlock.Message.CompletedFocusTab(),
        ),
        Story.message(
          Message.ChangedExampleUrl({ url: 'https://example.test' }),
        ),
        Story.inMessage(InMessage.InformedOfRouteChange({ slug: 'counters' })),
        Story.model(model => {
          expect(model.currentSources._tag).toBe('Loading')
          expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
          expect(model.maybeExampleUrl).toEqual(Option.none())
          expect(model.sourceFileTabs).toEqual(
            SourceFileTabsBlock.Model.make({
              id: 'source-file-tabs',
              maybeFocusedIndex: Option.none(),
              activationMode: 'Automatic',
            }),
          )
        }),
        Story.Command.expectExact(LoadExampleSources({ slug: 'counters' })),
        Story.Command.resolve(LoadExampleSources, failedSources),
      ),
  )

  it.effect(
    'clears existing sources when routing to an unavailable example',
    () =>
      Story.story(
        exampleDetailSubject,
        Story.init(Option.some('counter'), Option.some(sources)),
        Story.message(
          Message.ChangedExampleUrl({ url: 'https://example.test' }),
        ),
        Story.inMessage(InMessage.InformedOfRouteChange({ slug: 'livestore' })),
        Story.model(model => {
          expect(model.currentSources._tag).toBe('Idle')
          expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
          expect(model.maybeExampleUrl).toEqual(Option.none())
          expect(model.sourceFileTabs).toEqual(
            SourceFileTabsBlock.Model.make({
              id: 'source-file-tabs',
              maybeFocusedIndex: Option.none(),
              activationMode: 'Automatic',
            }),
          )
        }),
        Story.Command.expectNone(),
      ),
  )
})
