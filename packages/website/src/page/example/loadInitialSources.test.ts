import { Array, Option, pipe } from 'effect'
import { Calendar, Command, Update } from 'foldkit'
import type { StorySimulation } from 'foldkit/story'
import {
  Command as StoryCommand,
  model as expectModel,
  given,
  story,
} from 'foldkit/story'
import * as Url from 'foldkit/url'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import { Deployment } from '../../deployment'
import { init as initApplication } from '../../init'
import type { Message as ApplicationMessage } from '../../message'
import type { Model as ApplicationModel } from '../../model'
import { update as updateApplication } from '../../update'
import { block } from './block'
import { LoadExampleSources, Message, init, update } from './example'
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

const initialModel = () => init().model

const commandNames = (
  commands: ReturnType<typeof block.expose.loadInitialSources>['commands'],
): ReadonlyArray<string> =>
  pipe(
    commands ?? [],
    Array.map(command => command.name),
  )

describe('example detail initial sources', () => {
  test('preserves the initialized Model when there is no initial slug', () => {
    const model = initialModel()
    const unseededSourcesLoad = block.expose.loadInitialSources(
      model,
      Option.none(),
      Option.none(),
    )
    const seededSourcesLoad = block.expose.loadInitialSources(
      model,
      Option.none(),
      Option.some(sources),
    )

    expect(unseededSourcesLoad.model).toBe(model)
    expect(unseededSourcesLoad.commands).toBeUndefined()
    expect(seededSourcesLoad.model).toBe(model)
    expect(seededSourcesLoad.commands).toBeUndefined()
  })

  test('starts loading an available unseeded example from clean child state', () => {
    const loaded = update(
      initialModel(),
      Message.SucceededLoadExampleSources({ sources }),
    )
    const focused = update(
      loaded.model,
      Message.GotSourceFileTabsMessage({
        message: Tabs.Message.FocusedTab({ index: 2 }),
      }),
    )
    const withExampleUrl = update(
      focused.model,
      Message.ChangedExampleUrl({ url: 'https://example.test' }),
    )

    const unseededSourcesLoad = block.expose.loadInitialSources(
      withExampleUrl.model,
      Option.some('counter'),
      Option.none(),
    )

    expect(unseededSourcesLoad.model.currentSources._tag).toBe('Loading')
    expect(unseededSourcesLoad.model.maybeActiveSourceFilePath).toEqual(
      Option.none(),
    )
    expect(unseededSourcesLoad.model.maybeExampleUrl).toEqual(Option.none())
    expect(unseededSourcesLoad.model.sourceFileTabs).toEqual(
      Tabs.init({ id: 'source-file-tabs' }),
    )
    expect(commandNames(unseededSourcesLoad.commands)).toEqual([
      'ExampleDetail/LoadExampleSources',
    ])
    expectTypeOf<
      Update.RequirementsOf<typeof block.expose.loadInitialSources>
    >().toEqualTypeOf<Command.HandlerOf<typeof LoadExampleSources>>()
  })

  test('shows supplied sources without fetching them', () => {
    const seededSourcesLoad = block.expose.loadInitialSources(
      initialModel(),
      Option.some('counter'),
      Option.some(sources),
    )

    expect(seededSourcesLoad.model.currentSources).toEqual({
      _tag: 'Success',
      data: sources,
    })
    expect(seededSourcesLoad.model.maybeActiveSourceFilePath).toEqual(
      Option.some('src/application.ts'),
    )
    expect(seededSourcesLoad.commands).toBeUndefined()
  })

  test('leaves unavailable examples unchanged with or without supplied sources', () => {
    const model = initialModel()
    const unseededSourcesLoad = block.expose.loadInitialSources(
      model,
      Option.some('livestore'),
      Option.none(),
    )
    const seededSourcesLoad = block.expose.loadInitialSources(
      model,
      Option.some('livestore'),
      Option.some(sources),
    )

    expect(unseededSourcesLoad.model).toBe(model)
    expect(unseededSourcesLoad.commands).toBeUndefined()
    expect(seededSourcesLoad.model).toBe(model)
    expect(seededSourcesLoad.commands).toBeUndefined()
  })

  test('clears existing sources when routing to an unavailable example', () => {
    const loaded = block.expose.loadInitialSources(
      initialModel(),
      Option.some('counter'),
      Option.some(sources),
    )
    const withExampleUrl = update(
      loaded.model,
      Message.ChangedExampleUrl({ url: 'https://example.test' }),
    )

    const routeChange = block.expose.informRouteChanged(
      withExampleUrl.model,
      'livestore',
    )

    expect(routeChange.model.currentSources._tag).toBe('Idle')
    expect(routeChange.model.maybeActiveSourceFilePath).toEqual(Option.none())
    expect(routeChange.model.maybeExampleUrl).toEqual(Option.none())
    expect(routeChange.model.sourceFileTabs).toEqual(
      Tabs.init({ id: 'source-file-tabs' }),
    )
    expect(routeChange.commands).toEqual([])
  })

  test('lifts the loading Command and its result through the application binding', () => {
    const url = pipe(
      Url.fromString('https://foldkit.dev/example-apps/counter'),
      Option.getOrThrow,
    )
    const applicationInit = initApplication(
      {
        currentYear: 2026,
        today: Calendar.make(2026, 8, 30),
        deployment: Deployment.Canary({ commit: 'test' }),
        maybeApiData: Option.none(),
        maybeExampleSources: Option.none(),
      },
      url,
    )
    const loadInitialSourcesCommands = pipe(
      applicationInit.commands ?? [],
      Array.filter(
        command => command.name === 'exampleDetail/LoadExampleSources',
      ),
    )

    expect(applicationInit.model.exampleDetail.currentSources._tag).toBe(
      'Loading',
    )
    expect(
      pipe(
        loadInitialSourcesCommands,
        Array.map(command => command.name),
      ),
    ).toEqual(['exampleDetail/LoadExampleSources'])

    story(
      updateApplication,
      given(applicationInit.model),
      (simulation: StorySimulation<ApplicationModel, ApplicationMessage>) => ({
        ...simulation,
        model: applicationInit.model,
        commands: loadInitialSourcesCommands,
      }),
      StoryCommand.resolve(
        LoadExampleSources,
        Message.SucceededLoadExampleSources({ sources }),
      ),
      expectModel(model => {
        expect(model.exampleDetail.currentSources).toEqual({
          _tag: 'Success',
          data: sources,
        })
      }),
    )
  })
})
