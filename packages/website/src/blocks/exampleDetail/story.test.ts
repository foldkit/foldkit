import { Effect, type Layer, Option } from 'effect'
import {
  Command,
  type TestBlock,
  inMessage,
  init,
  message,
  messageFrom,
  model,
  story,
} from 'foldkit/story'
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
        const initialModel = yield* story(
          exampleDetailSubject,
          init(),
          model(model => {
            expect(model.currentSources._tag).toBe('Idle')
            expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
          }),
          Command.expectNone(),
        )

        yield* story(
          exampleDetailSubject,
          init(Option.none(), Option.some(sources)),
          model(model => expect(model).toEqual(initialModel)),
          Command.expectNone(),
        )
      }),
  )

  it.effect(
    'initializes an available unseeded example in Loading with its Command',
    () => {
      expectTypeOf<
        Layer.Services<TestBlock<typeof exampleDetailSubject>['EffectsLayer']>
      >().toEqualTypeOf<never>()

      return story(
        exampleDetailSubject,
        init(Option.some('counter')),
        model(model => {
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
        Command.expectExact(LoadExampleSources({ slug: 'counter' })),
        Command.resolve(LoadExampleSources, failedSources),
      )
    },
  )

  it.effect(
    'creates independent Tabs Models for repeated initializations',
    () =>
      Effect.gen(function* () {
        const firstModel = yield* story(
          exampleDetailSubject,
          init(Option.some('counter')),
          model(model => {
            expect(model.sourceFileTabs).toEqual(
              SourceFileTabsBlock.Model.make({
                id: 'source-file-tabs',
                maybeFocusedIndex: Option.none(),
                activationMode: 'Automatic',
              }),
            )
          }),
          Command.resolve(LoadExampleSources, failedSources),
        )

        yield* story(
          exampleDetailSubject,
          init(Option.some('counter')),
          model(model => {
            expect(model.sourceFileTabs).toEqual(firstModel.sourceFileTabs)
            expect(model.sourceFileTabs).not.toBe(firstModel.sourceFileTabs)
          }),
          Command.resolve(LoadExampleSources, failedSources),
        )
      }),
  )

  it.effect(
    'initializes supplied sources as Success without fetching them',
    () =>
      story(
        exampleDetailSubject,
        init(Option.some('counter'), Option.some(sources)),
        model(model => {
          expect(model.currentSources).toEqual({
            _tag: 'Success',
            data: sources,
          })
          expect(model.maybeActiveSourceFilePath).toEqual(
            Option.some('src/application.ts'),
          )
        }),
        Command.expectNone(),
      ),
  )

  it.effect(
    'initializes an empty supplied source list without a selected file',
    () => {
      const emptySources: ExampleSources = { files: [] }

      return story(
        exampleDetailSubject,
        init(Option.some('counter'), Option.some(emptySources)),
        model(model => {
          expect(model.currentSources).toEqual({
            _tag: 'Success',
            data: emptySources,
          })
          expect(model.maybeActiveSourceFilePath).toEqual(Option.none())
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'initializes unavailable examples as idle with or without supplied sources',
    () =>
      Effect.gen(function* () {
        const baseline = yield* story(
          exampleDetailSubject,
          init(),
          Command.expectNone(),
        )

        for (const maybeSources of [
          Option.none<ExampleSources>(),
          Option.some(sources),
        ]) {
          yield* story(
            exampleDetailSubject,
            init(Option.some('livestore'), maybeSources),
            model(model => expect(model).toEqual(baseline)),
            Command.expectNone(),
          )
        }
      }),
  )

  it.effect(
    'route changes reset existing source and child state before loading',
    () =>
      story(
        exampleDetailSubject,
        init(Option.some('counter'), Option.some(sources)),
        messageFrom(
          SourceFileTabsBinding,
          SourceFileTabsBlock.Message.FocusedTab({ index: 2 }),
        ),
        Command.resolve(
          Tabs.test.FocusTab,
          SourceFileTabsBlock.Message.CompletedFocusTab(),
        ),
        message(Message.ChangedExampleUrl({ url: 'https://example.test' })),
        inMessage(InMessage.InformedOfRouteChange({ slug: 'counters' })),
        model(model => {
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
        Command.expectExact(LoadExampleSources({ slug: 'counters' })),
        Command.resolve(LoadExampleSources, failedSources),
      ),
  )

  it.effect(
    'clears existing sources when routing to an unavailable example',
    () =>
      story(
        exampleDetailSubject,
        init(Option.some('counter'), Option.some(sources)),
        message(Message.ChangedExampleUrl({ url: 'https://example.test' })),
        inMessage(InMessage.InformedOfRouteChange({ slug: 'livestore' })),
        model(model => {
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
        Command.expectNone(),
      ),
  )
})
