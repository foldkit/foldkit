import { Array, Effect, Layer, Option, pipe } from 'effect'
import { type TestBlock, withBlock } from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { ExampleDetailBlock, layer } from './block'
import { SourceFileTabsBinding } from './composition'
import { LoadExampleSources, Message } from './example'
import { SourceFileTabsBlock } from './fileTabs'
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

const makeFixture = (block: TestBlock<typeof ExampleDetailBlock>) => {
  const init = block.init
  const update = block.update
  const commandNames = (
    commands: ReturnType<typeof init>['commands'],
  ): ReadonlyArray<string> =>
    pipe(
      commands ?? [],
      Array.map(command => command.name),
    )
  return { block, init, update, commandNames }
}

describe('example detail initial sources', () => {
  test('initializes idle when there is no initial slug, ignoring supplied sources', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { init } = makeFixture(executable)

        const unseededInit = init()
        const seededInit = init(Option.none(), Option.some(sources))

        expect(unseededInit.model.currentSources._tag).toBe('Idle')
        expect(unseededInit.model.maybeActiveSourceFilePath).toEqual(
          Option.none(),
        )
        expect(unseededInit.commands).toEqual([])
        expect(seededInit.model).toEqual(unseededInit.model)
        expect(seededInit.commands).toEqual([])
      }).pipe(Effect.provide(layer)),
    )
  })

  test('initializes an available unseeded example in Loading with its Command', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { block, init, commandNames } = makeFixture(executable)

        const exampleInit = init(Option.some('counter'))

        expect(exampleInit.model.currentSources._tag).toBe('Loading')
        expect(exampleInit.model.maybeActiveSourceFilePath).toEqual(
          Option.none(),
        )
        expect(exampleInit.model.maybeExampleUrl).toEqual(Option.none())
        expect(exampleInit.model.sourceFileTabs).toEqual(
          SourceFileTabsBlock.Model.make({
            id: 'source-file-tabs',
            maybeFocusedIndex: Option.none(),
            activationMode: 'Automatic',
          }),
        )
        expect(commandNames(exampleInit.commands)).toEqual([
          LoadExampleSources.name,
        ])
        expectTypeOf<
          Layer.Services<typeof block.EffectsLayer>
        >().toEqualTypeOf<never>()
      }).pipe(Effect.provide(layer)),
    )
  })

  test('creates independent Tabs Models for repeated initializations', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { init } = makeFixture(executable)

        const firstInit = init(Option.some('counter'))
        const secondInit = init(Option.some('counter'))

        expect(firstInit.model.sourceFileTabs).toEqual(
          SourceFileTabsBlock.Model.make({
            id: 'source-file-tabs',
            maybeFocusedIndex: Option.none(),
            activationMode: 'Automatic',
          }),
        )
        expect(secondInit.model.sourceFileTabs).toEqual(
          firstInit.model.sourceFileTabs,
        )
        expect(secondInit.model.sourceFileTabs).not.toBe(
          firstInit.model.sourceFileTabs,
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('initializes supplied sources as Success without fetching them', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { init } = makeFixture(executable)

        const exampleInit = init(Option.some('counter'), Option.some(sources))

        expect(exampleInit.model.currentSources).toEqual({
          _tag: 'Success',
          data: sources,
        })
        expect(exampleInit.model.maybeActiveSourceFilePath).toEqual(
          Option.some('src/application.ts'),
        )
        expect(exampleInit.commands).toEqual([])
      }).pipe(Effect.provide(layer)),
    )
  })

  test('initializes an empty supplied source list without a selected file', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { init } = makeFixture(executable)

        const emptySources: ExampleSources = { files: [] }
        const exampleInit = init(
          Option.some('counter'),
          Option.some(emptySources),
        )

        expect(exampleInit.model.currentSources).toEqual({
          _tag: 'Success',
          data: emptySources,
        })
        expect(exampleInit.model.maybeActiveSourceFilePath).toEqual(
          Option.none(),
        )
        expect(exampleInit.commands).toEqual([])
      }).pipe(Effect.provide(layer)),
    )
  })

  test('initializes unavailable examples as idle with or without supplied sources', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { init } = makeFixture(executable)

        const baseline = init()
        const unseededInit = init(Option.some('livestore'))
        const seededInit = init(Option.some('livestore'), Option.some(sources))

        expect(unseededInit.model).toEqual(baseline.model)
        expect(unseededInit.commands).toEqual([])
        expect(seededInit.model).toEqual(baseline.model)
        expect(seededInit.commands).toEqual([])
      }).pipe(Effect.provide(layer)),
    )
  })

  test('route changes reset existing source and child state before loading', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { block, init, update } = makeFixture(executable)

        const exampleInit = init(Option.some('counter'), Option.some(sources))
        const focused = update(
          exampleInit.model,
          toParentMessageFor(block)(
            SourceFileTabsBinding,
            SourceFileTabsBlock.Message.FocusedTab({ index: 2 }),
          ),
        )
        const withExampleUrl = update(
          focused.model,
          Message.ChangedExampleUrl({ url: 'https://example.test' }),
        )
        const routeChange = block.operations.informRouteChange(
          withExampleUrl.model,
          { slug: 'counters' },
        )

        expect(routeChange.model.currentSources._tag).toBe('Loading')
        expect(routeChange.model.maybeActiveSourceFilePath).toEqual(
          Option.none(),
        )
        expect(routeChange.model.maybeExampleUrl).toEqual(Option.none())
        expect(routeChange.model.sourceFileTabs).toEqual(
          SourceFileTabsBlock.Model.make({
            id: 'source-file-tabs',
            maybeFocusedIndex: Option.none(),
            activationMode: 'Automatic',
          }),
        )
        expect(routeChange.commands?.map(command => command.name)).toEqual([
          LoadExampleSources.name,
        ])
      }).pipe(Effect.provide(layer)),
    )
  })

  test('clears existing sources when routing to an unavailable example', async () => {
    await Effect.runPromise(
      withBlock(ExampleDetailBlock, executable => {
        const { block, init, update } = makeFixture(executable)

        const exampleInit = init(Option.some('counter'), Option.some(sources))
        const withExampleUrl = update(
          exampleInit.model,
          Message.ChangedExampleUrl({ url: 'https://example.test' }),
        )
        const routeChange = block.operations.informRouteChange(
          withExampleUrl.model,
          { slug: 'livestore' },
        )

        expect(routeChange.model.currentSources._tag).toBe('Idle')
        expect(routeChange.model.maybeActiveSourceFilePath).toEqual(
          Option.none(),
        )
        expect(routeChange.model.maybeExampleUrl).toEqual(Option.none())
        expect(routeChange.model.sourceFileTabs).toEqual(
          SourceFileTabsBlock.Model.make({
            id: 'source-file-tabs',
            maybeFocusedIndex: Option.none(),
            activationMode: 'Automatic',
          }),
        )
        expect(routeChange.commands).toEqual([])
      }).pipe(Effect.provide(layer)),
    )
  })
})
