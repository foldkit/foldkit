import { Array, Option, Schema, pipe } from 'effect'
import { type Block, Command, Update } from 'foldkit'
import { describe, expect, expectTypeOf, test, vi } from 'vitest'

import { ExampleDetailBlock } from './block'
import { ExampleDetailComposition } from './composition'
import { LoadExampleSources, Message, init, update } from './example'
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

const commandNames = (
  commands: ReturnType<typeof init>['commands'],
): ReadonlyArray<string> =>
  pipe(
    commands ?? [],
    Array.map(command => command.name),
  )

describe('example detail initial sources', () => {
  test('initializes idle when there is no initial slug, ignoring supplied sources', () => {
    const unseededInit = init()
    const seededInit = init(Option.none(), Option.some(sources))

    expect(unseededInit.model.currentSources._tag).toBe('Idle')
    expect(unseededInit.model.maybeActiveSourceFilePath).toEqual(Option.none())
    expect(unseededInit.commands).toEqual([])
    expect(seededInit.model).toEqual(unseededInit.model)
    expect(seededInit.commands).toEqual([])
  })

  test('initializes an available unseeded example in Loading with its Command', () => {
    const exampleInit = init(Option.some('counter'))

    expect(exampleInit.model.currentSources._tag).toBe('Loading')
    expect(exampleInit.model.maybeActiveSourceFilePath).toEqual(Option.none())
    expect(exampleInit.model.maybeExampleUrl).toEqual(Option.none())
    expect(exampleInit.model.sourceFileTabs).toEqual(
      SourceFileTabsBlock.init({ id: 'source-file-tabs' }).model,
    )
    expect(commandNames(exampleInit.commands)).toEqual([
      LoadExampleSources.name,
    ])
    expectTypeOf<Update.RequirementsOf<typeof init>>().toEqualTypeOf<
      | Command.HandlerOf<typeof LoadExampleSources>
      | Block.Qualify<
          'sourceFileTabs',
          Update.RequirementsOf<typeof SourceFileTabsBlock.init>
        >
    >()
  })

  test('initializes its Tabs child once when loading initial sources', () => {
    const tabsInit = vi.spyOn(SourceFileTabsBlock, 'init')

    try {
      init(Option.some('counter'))

      expect(tabsInit).toHaveBeenCalledExactlyOnceWith({
        id: 'source-file-tabs',
      })
    } finally {
      tabsInit.mockRestore()
    }
  })

  test('initializes supplied sources as Success without fetching them', () => {
    const exampleInit = init(Option.some('counter'), Option.some(sources))

    expect(exampleInit.model.currentSources).toEqual({
      _tag: 'Success',
      data: sources,
    })
    expect(exampleInit.model.maybeActiveSourceFilePath).toEqual(
      Option.some('src/application.ts'),
    )
    expect(exampleInit.commands).toEqual([])
  })

  test('initializes an empty supplied source list without a selected file', () => {
    const emptySources: ExampleSources = { files: [] }
    const exampleInit = init(Option.some('counter'), Option.some(emptySources))

    expect(exampleInit.model.currentSources).toEqual({
      _tag: 'Success',
      data: emptySources,
    })
    expect(exampleInit.model.maybeActiveSourceFilePath).toEqual(Option.none())
    expect(exampleInit.commands).toEqual([])
  })

  test('initializes unavailable examples as idle with or without supplied sources', () => {
    const baseline = init()
    const unseededInit = init(Option.some('livestore'))
    const seededInit = init(Option.some('livestore'), Option.some(sources))

    expect(unseededInit.model).toEqual(baseline.model)
    expect(unseededInit.commands).toEqual([])
    expect(seededInit.model).toEqual(baseline.model)
    expect(seededInit.commands).toEqual([])
  })

  test('route changes reset existing source and child state before loading', () => {
    const exampleInit = init(Option.some('counter'), Option.some(sources))
    const focused = update(
      exampleInit.model,
      Schema.decodeSync(ExampleDetailComposition.Message)({
        _tag: 'GotSourceFileTabsMessage',
        placement: 'sourceFileTabs',
        generation: 0,
        message: SourceFileTabsBlock.Message.FocusedTab({ index: 2 }),
      }),
    )
    const withExampleUrl = update(
      focused.model,
      Message.ChangedExampleUrl({ url: 'https://example.test' }),
    )
    const routeChange = ExampleDetailBlock.operations.informRouteChanged(
      withExampleUrl.model,
      { slug: 'counters' },
    )

    expect(routeChange.model.currentSources._tag).toBe('Loading')
    expect(routeChange.model.maybeActiveSourceFilePath).toEqual(Option.none())
    expect(routeChange.model.maybeExampleUrl).toEqual(Option.none())
    expect(routeChange.model.sourceFileTabs).toEqual(
      SourceFileTabsBlock.init({ id: 'source-file-tabs' }).model,
    )
    expect(routeChange.commands?.map(command => command.name)).toEqual([
      LoadExampleSources.name,
    ])
  })

  test('clears existing sources when routing to an unavailable example', () => {
    const exampleInit = init(Option.some('counter'), Option.some(sources))
    const withExampleUrl = update(
      exampleInit.model,
      Message.ChangedExampleUrl({ url: 'https://example.test' }),
    )
    const routeChange = ExampleDetailBlock.operations.informRouteChanged(
      withExampleUrl.model,
      { slug: 'livestore' },
    )

    expect(routeChange.model.currentSources._tag).toBe('Idle')
    expect(routeChange.model.maybeActiveSourceFilePath).toEqual(Option.none())
    expect(routeChange.model.maybeExampleUrl).toEqual(Option.none())
    expect(routeChange.model.sourceFileTabs).toEqual(
      SourceFileTabsBlock.init({ id: 'source-file-tabs' }).model,
    )
    expect(routeChange.commands).toEqual([])
  })
})
