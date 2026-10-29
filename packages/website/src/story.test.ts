import { HashSet, Option, pipe } from 'effect'
import { Block, Calendar } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import * as Url from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { DialogBlock } from '@foldkit/ui'
import { test as DialogTest } from '@foldkit/ui/dialog'

import {
  LoadPlayground,
  ScrollSidebarActiveLinkIntoView,
  ScrollToAnchor,
  ScrollToTop,
} from './command'
import {
  ApiReferenceBinding,
  ExampleDetailBinding,
  HomeBinding,
  SnippetCopyBinding,
  SnippetDisclosureBinding,
} from './composition'
import { Deployment } from './deployment'
import { init } from './init'
import { Message } from './message'
import { type Model } from './model'
import { ApiReferenceBlock, ExampleDetailBlock } from './page'
import * as ApiReference from './page/apiReference/domain'
import { HomeBlock } from './page/home'
import {
  NotePlayerDemoBinding,
  PlaygroundMenuBinding,
} from './page/home/composition'
import { NotePlayerDemoBlock } from './page/home/notePlayerDemo'
import { SearchBlock } from './search'
import { FocusSearchInput } from './search/update'
import { SnippetCopyBlock } from './snippetCopy'
import {
  CopySnippet,
  WaitBeforeHidingCopiedIndicator,
} from './snippetCopy/update'
import { SnippetDisclosureBlock } from './snippetDisclosure'
import { update } from './update'
import { ThemeMenuBlock } from './view/themeMenu'

type HomeBlockModel = typeof HomeBlock.Model.Type
const parseUrl = (value: string): Url.Url =>
  pipe(Url.fromString(value), Option.getOrThrow)
const homeUrl = parseUrl('https://foldkit.dev/')
const newsletterUrl = parseUrl('https://foldkit.dev/newsletter')
const playgroundCounterUrl = parseUrl('https://foldkit.dev/playground/counter')
const playgroundCountersUrl = parseUrl(
  'https://foldkit.dev/playground/counters',
)
const counterExampleUrl = parseUrl('https://foldkit.dev/example-apps/counter')
const countersExampleUrl = parseUrl('https://foldkit.dev/example-apps/counters')
const commandApiUrl = parseUrl('https://foldkit.dev/api-reference/command')
const updateApiUrl = parseUrl('https://foldkit.dev/api-reference/update')
const homeUrlWithHash = parseUrl('https://foldkit.dev/#demos')
const commandApiUrlWithHash = parseUrl(
  'https://foldkit.dev/api-reference/command#definition',
)
const counterExampleUrlWithHash = parseUrl(
  'https://foldkit.dev/example-apps/counter#application',
)
const flags = {
  currentYear: 2026,
  today: Calendar.make(2026, 8, 30),
  deployment: Deployment.Canary({ commit: 'test' }),
  maybeApiData: Option.none(),
  maybeExampleSources: Option.none(),
}
const initAt = (url: Url.Url): Model => init(flags, url).model
const expectHomePresent = (model: Model): void => {
  expect(Option.isSome(model.maybeHome)).toBe(true)
  expect(
    Option.isSome(
      Block.inspectBinding(HomeBinding).managedResources[
        'notePlayerDemo/audioContext'
      ].modelToMaybeRequirements(model),
    ),
  ).toBe(true)
}
const expectHomeAbsent = (model: Model): void => {
  expect(Option.isNone(model.maybeHome)).toBe(true)
  expect(
    Option.isNone(
      Block.inspectBinding(HomeBinding).managedResources[
        'notePlayerDemo/audioContext'
      ].modelToMaybeRequirements(model),
    ),
  ).toBe(true)
}
const expectDefaultHome = (home: HomeBlockModel): void => {
  expect(home.activeDemoTab).toBe('AsyncCounter')
  expect(home.asyncCounterDemo.count).toBe(0)
  expect(home.notePlayerDemo.noteInput.value).toBe('CDEFGABC')
  expect(home.notePlayerDemo.playbackState._tag).toBe('Idle')
}
const resolvePathChangeCommands = () => [
  Command.resolve(ScrollToTop, Message.CompletedScrollToTop()),
  Command.resolve(
    ScrollSidebarActiveLinkIntoView,
    Message.CompletedScrollSidebarActiveLinkIntoView(),
  ),
]
describe('application', () => {
  test('cold startup collects root Commands before initialized child Commands', () => {
    const initialization = init(
      { ...flags, deployment: Deployment.Production() },
      counterExampleUrl,
    )
    expect(initialization.commands?.map(command => command.name)).toEqual([
      'Application/LoadBrowserEnvironment',
      'Application/InjectAnalytics',
      'Application/InjectSpeedInsights',
      'Application/ScrollSidebarActiveLinkIntoView',
      'apiReference/LoadApiData',
      'exampleDetail/LoadExampleSources',
    ])
  })
  test('startup includes the initial anchor in its root Commands', () => {
    const initialization = init(flags, counterExampleUrlWithHash)

    expect(initialization.commands?.map(command => command.name)).toEqual([
      'Application/LoadBrowserEnvironment',
      ScrollSidebarActiveLinkIntoView.name,
      ScrollToAnchor.name,
      'apiReference/LoadApiData',
      'exampleDetail/LoadExampleSources',
    ])
    expect(initialization.commands).toContainEqual(
      expect.objectContaining({
        name: ScrollToAnchor.name,
        args: { hash: 'application' },
      }),
    )
  })
  test('navigation opens an existing closed sidebar group', () => {
    const initialModel = initAt(homeUrl)
    expect(initialModel.sidebarGroups.apiReference).toBe(false)
    const routeChange = update(
      initialModel,
      Message.ChangedUrl({ url: commandApiUrl }),
    )
    expect(routeChange.model.sidebarGroups.apiReference).toBe(true)
    expect(routeChange.model.sidebarGroups.examples).toBe(
      initialModel.sidebarGroups.examples,
    )
  })
  test('navigation within an open sidebar group preserves its state', () => {
    const initialModel = initAt(commandApiUrl)
    expect(initialModel.sidebarGroups.apiReference).toBe(true)
    const routeChange = update(
      initialModel,
      Message.ChangedUrl({ url: updateApiUrl }),
    )
    expect(routeChange.model.sidebarGroups).toBe(initialModel.sidebarGroups)
  })
  test('prerendered API startup retains its slice through failure and route retry', () => {
    const seededData = ApiReference.ApiData.make({
      parsedApi: { modules: [] },
      highlights: {},
    })
    const initialization = init(
      { ...flags, maybeApiData: Option.some(seededData) },
      commandApiUrl,
    )
    expect(initialization.model.apiReference.apiData).toEqual(
      ApiReference.ApiDataAsyncData.Refreshing({ data: seededData }),
    )
    expect(initialization.commands?.map(command => command.name)).toContain(
      'apiReference/LoadApiData',
    )
    const failedLoad = update(
      initialization.model,
      toParentMessage(
        ApiReferenceBinding,
        ApiReferenceBlock.Message.FailedLoadApiData({ error: 'Offline' }),
      ),
    )
    const routeChange = update(
      failedLoad.model,
      Message.ChangedUrl({ url: updateApiUrl }),
    )
    expect(failedLoad.model.apiReference.apiData).toEqual(
      ApiReference.ApiDataAsyncData.Stale({
        data: seededData,
        error: 'Offline',
      }),
    )
    expect(routeChange.model.apiReference.apiData).toEqual(
      ApiReference.ApiDataAsyncData.Refreshing({ data: seededData }),
    )
    expect(routeChange.commands?.map(command => command.name)).toContain(
      'apiReference/LoadApiData',
    )
  })
  test('remaining on a Playground slug preserves its Model', () => {
    const initialModel = initAt(playgroundCounterUrl)
    const initialPlayground = Option.getOrThrow(initialModel.playground)
    const urlWithHash = parseUrl(
      'https://foldkit.dev/playground/counter#src/application.ts',
    )
    const routeChange = update(
      initialModel,
      Message.ChangedUrl({
        url: urlWithHash,
      }),
    )
    expect(Option.getOrThrow(routeChange.model.playground)).toBe(
      initialPlayground,
    )
    expect(routeChange.commands?.map(command => command.name)).toEqual([
      'Application/ScrollToAnchor',
    ])
  })
  test('changing Playground slugs initializes a fresh Model', () => {
    const initialModel = initAt(playgroundCounterUrl)
    const initialPlayground = Option.getOrThrow(initialModel.playground)
    const routeChange = update(
      initialModel,
      Message.ChangedUrl({ url: playgroundCountersUrl }),
    )
    const nextPlayground = Option.getOrThrow(routeChange.model.playground)
    expect(nextPlayground).not.toBe(initialPlayground)
    expect(nextPlayground.slug).toBe('counters')
  })
  test.each([
    { isPlaygroundSupported: true },
    { isPlaygroundSupported: false },
  ])(
    'entering Playground reuses cached browser support ($isPlaygroundSupported)',
    ({ isPlaygroundSupported }) => {
      const loadedBrowserEnvironment = update(
        initAt(newsletterUrl),
        Message.CompletedLoadBrowserEnvironment({
          maybeThemePreference: Option.none(),
          maybeSidebarState: Option.none(),
          systemTheme: 'Light',
          isPlaygroundSupported,
          currentYear: flags.currentYear,
          today: flags.today,
        }),
      )
      const enteredPlayground = update(
        loadedBrowserEnvironment.model,
        Message.ChangedUrl({ url: playgroundCounterUrl }),
      )
      expect(
        Option.getOrThrow(enteredPlayground.model.playground).maybeIsSupported,
      ).toEqual(Option.some(isPlaygroundSupported))
    },
  )
  test('entering and exiting Playground adds and removes its Model', () => {
    const enteredPlayground = update(
      initAt(newsletterUrl),
      Message.ChangedUrl({ url: playgroundCounterUrl }),
    )
    expect(Option.getOrThrow(enteredPlayground.model.playground).slug).toBe(
      'counter',
    )
    expect(enteredPlayground.commands?.map(command => command.name)).toEqual([
      'Application/ScrollToTop',
      'Application/ScrollSidebarActiveLinkIntoView',
    ])
    const exitedPlayground = update(
      enteredPlayground.model,
      Message.ChangedUrl({ url: newsletterUrl }),
    )
    expect(Option.isNone(exitedPlayground.model.playground)).toBe(true)
    expect(exitedPlayground.commands?.map(command => command.name)).toEqual([
      'Application/ScrollToTop',
      'Application/ScrollSidebarActiveLinkIntoView',
    ])
  })
  test.each([
    {
      routeName: 'API module',
      initialUrl: commandApiUrl,
      urlWithHash: commandApiUrlWithHash,
    },
    {
      routeName: 'example',
      initialUrl: counterExampleUrl,
      urlWithHash: counterExampleUrlWithHash,
    },
  ])(
    'remaining on the same $routeName slug does not reload route data',
    ({ initialUrl, urlWithHash }) => {
      const routeChange = update(
        initAt(initialUrl),
        Message.ChangedUrl({ url: urlWithHash }),
      )
      expect(routeChange.commands?.map(command => command.name)).toEqual([
        'Application/ScrollToAnchor',
      ])
    },
  )
  test('route cleanup precedes scrolling to an anchor on a new path', () => {
    const openedSearch = update(
      initAt(newsletterUrl),
      Message.ClickedOpenSearch(),
    )
    const routeChange = update(
      openedSearch.model,
      Message.ChangedUrl({ url: homeUrlWithHash }),
    )
    expect(routeChange.model.search.dialog.isOpen).toBe(false)
    expect(routeChange.commands?.map(command => command.name)).toEqual([
      'search/dialog/CloseDialog',
      'Application/ScrollToAnchor',
      'Application/ScrollSidebarActiveLinkIntoView',
    ])
  })
  test('changing API module slugs retries missing API data', () => {
    const failedLoad = update(
      initAt(commandApiUrl),
      toParentMessage(
        ApiReferenceBinding,
        ApiReferenceBlock.Message.FailedLoadApiData({ error: 'failed' }),
      ),
    )
    const routeChange = update(
      failedLoad.model,
      Message.ChangedUrl({ url: updateApiUrl }),
    )
    expect(routeChange.model.apiReference.apiData._tag).toBe('Loading')
    expect(routeChange.commands?.map(command => command.name)).toContain(
      'apiReference/LoadApiData',
    )
  })
  test('changing example slugs requests the next example sources', () => {
    const failedLoad = update(
      initAt(counterExampleUrl),
      toParentMessage(
        ExampleDetailBinding,
        ExampleDetailBlock.Message.FailedLoadExampleSources({
          error: 'failed',
        }),
      ),
    )
    const routeChange = update(
      failedLoad.model,
      Message.ChangedUrl({ url: countersExampleUrl }),
    )
    expect(routeChange.model.exampleDetail.currentSources._tag).toBe('Loading')
    expect(routeChange.commands?.map(command => command.name)).toContain(
      'exampleDetail/LoadExampleSources',
    )
  })
  test('newsletter email follows navigation between Home and Newsletter', () => {
    story(
      update,
      given(initAt(homeUrl)),
      message(
        toParentMessage(
          HomeBinding,
          HomeBlock.Message.UpdatedNewsletterEmail({
            value: 'alice@example.com',
          }),
        ),
      ),
      model(model => {
        expect(model.newsletterEmail).toBe('alice@example.com')
      }),
      message(Message.ChangedUrl({ url: newsletterUrl })),
      ...resolvePathChangeCommands(),
      model(model => {
        expect(model.newsletterEmail).toBe('alice@example.com')
      }),
      message(Message.UpdatedNewsletterEmail({ value: 'bob@example.com' })),
      model(model => {
        expect(model.newsletterEmail).toBe('bob@example.com')
      }),
      message(Message.ChangedUrl({ url: homeUrl })),
      ...resolvePathChangeCommands(),
      model(model => {
        expect(model.newsletterEmail).toBe('bob@example.com')
      }),
    )
  })
  test('entering Home initializes fresh state', () => {
    story(
      update,
      given(initAt(newsletterUrl)),
      model(expectHomeAbsent),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expectHomePresent(model)
        expectDefaultHome(Option.getOrThrow(model.maybeHome))
      }),
      ...resolvePathChangeCommands(),
    )
  })
  test('leaving Home removes the Home Block', () => {
    story(
      update,
      given(initAt(homeUrl)),
      model(expectHomePresent),
      message(Message.ChangedUrl({ url: newsletterUrl })),
      model(expectHomeAbsent),
      ...resolvePathChangeCommands(),
    )
  })
  test('remaining on Home preserves the existing Home Model', () => {
    const initialModel = initAt(homeUrl)
    const initialHome = Option.getOrThrow(initialModel.maybeHome)
    story(
      update,
      given(initialModel),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expect(Option.getOrThrow(model.maybeHome)).toBe(initialHome)
      }),
    )
  })
  test('returning to Home initializes fresh default state', () => {
    story(
      update,
      given(initAt(homeUrl)),
      message(
        toParentMessage(
          HomeBinding,
          toParentMessage(
            NotePlayerDemoBinding,
            NotePlayerDemoBlock.Message.ChangedNoteInput({ value: 'ABC' }),
          ),
        ),
      ),
      model(model => {
        expect(
          Option.getOrThrow(model.maybeHome).notePlayerDemo.noteInput.value,
        ).toBe('ABC')
      }),
      message(Message.ChangedUrl({ url: newsletterUrl })),
      ...resolvePathChangeCommands(),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expectHomePresent(model)
        expectDefaultHome(Option.getOrThrow(model.maybeHome))
      }),
      ...resolvePathChangeCommands(),
    )
  })
  test('late Home Messages are ignored while Home is absent', () => {
    story(
      update,
      given(initAt(newsletterUrl)),
      message(
        toParentMessage(
          HomeBinding,
          toParentMessage(
            NotePlayerDemoBinding,
            NotePlayerDemoBlock.Message.ChangedNoteInput({ value: 'ABC' }),
          ),
        ),
      ),
      model(model => {
        expectHomeAbsent(model)
      }),
      Command.expectNone(),
    )
  })
  test('Home playground selections load a fresh document', () => {
    story(
      update,
      given(initAt(homeUrl)),
      message(
        toParentMessage(
          HomeBinding,
          toParentMessage(
            PlaygroundMenuBinding,
            ThemeMenuBlock.Message.SelectedItem({
              index: 0,
              item: 'counter',
            }),
          ),
        ),
      ),
      Command.resolve(LoadPlayground, Message.CompletedLoadPlayground()),
    )
  })
  test('the parent opens Search through its child update capability', () => {
    story(
      update,
      given(initAt(homeUrl)),
      message(Message.ClickedOpenSearch()),
      model(model => {
        expect(model.search.dialog.isOpen).toBe(true)
      }),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      Command.resolve(
        FocusSearchInput,
        SearchBlock.Message.CompletedFocusSearchInput(),
      ),
    )
  })
  test('the parent delegates snippet copying to the child Block', () => {
    const snippetId = 'root-story-snippet'
    story(
      update,
      given(initAt(homeUrl)),
      message(
        toParentMessage(
          SnippetCopyBinding,
          SnippetCopyBlock.Message.ClickedCopySnippet({
            snippetId,
            text: 'const count = 0',
          }),
        ),
      ),
      Command.resolve(
        CopySnippet,
        SnippetCopyBlock.Message.SucceededCopySnippet({ snippetId }),
      ),
      model(model => {
        expect(HashSet.has(model.snippetCopy.copiedSnippetIds, snippetId)).toBe(
          true,
        )
      }),
      Command.resolve(
        WaitBeforeHidingCopiedIndicator,
        SnippetCopyBlock.Message.CompletedWaitBeforeHidingCopiedIndicator({
          snippetId,
        }),
      ),
    )
  })
  test('the parent owns each snippet disclosure state', () => {
    const disclosureId = 'root-story-snippet'
    story(
      update,
      given(initAt(homeUrl)),
      message(
        toParentMessage(
          SnippetDisclosureBinding,
          SnippetDisclosureBlock.Message.ToggledCodeDisclosure({
            disclosureId,
            isOpen: true,
          }),
        ),
      ),
      model(model => {
        expect(
          HashSet.has(model.snippetDisclosure.openDisclosureIds, disclosureId),
        ).toBe(true)
      }),
    )
  })
})
