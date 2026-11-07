import { HashSet, Option, pipe } from 'effect'
import { Calendar, Story } from 'foldkit'
import * as Url from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import {
  HomeBlock,
  SearchBlock,
  SnippetCopyBlock,
  SnippetDisclosureBlock,
} from './blocks'
import { LoadApiData } from './blocks/apiReference/command'
import * as ApiReference from './blocks/apiReference/domain'
import { Message as ApiReferenceMessage } from './blocks/apiReference/message'
import {
  Message as ExampleDetailMessage,
  LoadExampleSources,
} from './blocks/exampleDetail/example'
import { NotePlayerDemoBlock } from './blocks/home/blocks'
import { managedResources as notePlayerResources } from './blocks/home/blocks/notePlayerDemo/resource'
import {
  NotePlayerDemoBinding,
  PlaygroundMenuBinding,
} from './blocks/home/composition'
import { FocusSearchInput } from './blocks/search/command'
import {
  CopySnippet,
  WaitBeforeHidingCopiedIndicator,
} from './blocks/snippetCopy/update'
import {
  InjectAnalytics,
  InjectSpeedInsights,
  LoadBrowserEnvironment,
  LoadPlayground,
  ScrollSidebarActiveLinkIntoView,
  ScrollToAnchor,
  ScrollToTop,
} from './command'
import {
  MaybeHomeBinding,
  SnippetCopyBinding,
  SnippetDisclosureBinding,
} from './composition'
import { Deployment, isTelemetryEnabled } from './deployment'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import type { Model } from './model'
import { ApplyTheme } from './theme'
import { ThemeMenuBlock } from './view/themeMenu'

const application = { block: ApplicationBlock, layer }

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

const expectHomePresent = (model: Model): void => {
  expect(Option.isSome(model.maybeHome)).toBe(true)
  expect(
    Option.isSome(
      Option.flatMap(model.maybeHome, home =>
        notePlayerResources.audioContext.modelToMaybeRequirements(
          home.notePlayerDemo,
        ),
      ),
    ),
  ).toBe(true)
}
const expectHomeAbsent = (model: Model): void => {
  expect(Option.isNone(model.maybeHome)).toBe(true)
  expect(
    Option.isNone(
      Option.flatMap(model.maybeHome, home =>
        notePlayerResources.audioContext.modelToMaybeRequirements(
          home.notePlayerDemo,
        ),
      ),
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
  Story.Command.resolve(ScrollToTop, Message.CompletedScrollToTop()),
  Story.Command.resolve(
    ScrollSidebarActiveLinkIntoView,
    Message.CompletedScrollSidebarActiveLinkIntoView(),
  ),
]

const updateApiUrl = parseUrl('https://foldkit.dev/api-reference/update')

const browserEnvironment = (isPlaygroundSupported = true) =>
  Message.CompletedLoadBrowserEnvironment({
    maybeThemePreference: Option.none(),
    maybeSidebarState: Option.none(),
    systemTheme: 'Light',
    isPlaygroundSupported,
    currentYear: flags.currentYear,
    today: flags.today,
  })
const apiData = ApiReference.ApiData.make({
  parsedApi: { modules: [] },
  highlights: {},
})
const resolveBrowserStartup = (
  url: Url.Url,
  deployment: Deployment = flags.deployment,
  isPlaygroundSupported = true,
) =>
  Story.steps(
    Story.Command.resolve(
      LoadBrowserEnvironment,
      browserEnvironment(isPlaygroundSupported),
    ),
    Story.Command.resolve(ApplyTheme, Message.CompletedApplyTheme()),
    ...(isTelemetryEnabled(deployment)
      ? [
          Story.Command.resolve(
            InjectAnalytics,
            Message.CompletedInjectAnalytics(),
          ),
          Story.Command.resolve(
            InjectSpeedInsights,
            Message.CompletedInjectSpeedInsights(),
          ),
        ]
      : []),
    Story.Command.resolve(
      ScrollSidebarActiveLinkIntoView,
      Message.CompletedScrollSidebarActiveLinkIntoView(),
    ),
    ...Option.match(url.hash, {
      onNone: () => [],
      onSome: hash => [
        Story.Command.resolve(
          ScrollToAnchor({ hash }),
          Message.CompletedScrollToAnchor(),
        ),
      ],
    }),
  )
const resolveInitialData = () =>
  Story.Command.resolveAll(
    [LoadApiData, ApiReferenceMessage.SucceededLoadApiData({ apiData })],
    [
      LoadExampleSources,
      ExampleDetailMessage.SucceededLoadExampleSources({
        sources: { files: [] },
      }),
    ],
  )
const completeStartup = (url: Url.Url) =>
  Story.steps(resolveBrowserStartup(url), resolveInitialData())

describe('application', () => {
  it.effect(
    'cold startup collects root Commands before initialized child Commands',
    () => {
      const deployment = Deployment.Production()
      const startupCommands = [
        LoadBrowserEnvironment,
        InjectAnalytics,
        InjectSpeedInsights,
        ScrollSidebarActiveLinkIntoView,
        LoadApiData,
        LoadExampleSources,
      ]

      return Story.story(
        application,
        Story.init({ ...flags, deployment }, counterExampleUrl),
        Story.Command.expectExactInOrder(...startupCommands),
        resolveBrowserStartup(counterExampleUrl, deployment),
        resolveInitialData(),
      )
    },
  )

  it.effect('startup includes the initial anchor in its root Commands', () => {
    return Story.story(
      application,
      Story.init(flags, counterExampleUrlWithHash),
      Story.Command.expectExactInOrder(
        LoadBrowserEnvironment,
        ScrollSidebarActiveLinkIntoView,
        ScrollToAnchor({ hash: 'application' }),
        LoadApiData,
        LoadExampleSources,
      ),
      resolveBrowserStartup(counterExampleUrlWithHash),
      resolveInitialData(),
    )
  })

  it.effect('navigation opens an existing closed sidebar group', () => {
    return Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.model(model => {
        expect(model.sidebarGroups.apiReference).toBe(false)
      }),
      Story.models(
        Story.steps(Story.message(Message.ChangedUrl({ url: commandApiUrl }))),
        (before, after) => {
          expect(after.sidebarGroups.apiReference).toBe(true)
          expect(after.sidebarGroups.examples).toBe(
            before.sidebarGroups.examples,
          )
        },
      ),
      ...resolvePathChangeCommands(),
    )
  })

  it.effect(
    'navigation within an open sidebar group preserves its state',
    () => {
      return Story.story(
        application,
        Story.init(flags, commandApiUrl),
        completeStartup(commandApiUrl),
        Story.model(model => {
          expect(model.sidebarGroups.apiReference).toBe(true)
        }),
        Story.models(
          Story.steps(Story.message(Message.ChangedUrl({ url: updateApiUrl }))),
          (before, after) =>
            expect(after.sidebarGroups).toBe(before.sidebarGroups),
        ),
        ...resolvePathChangeCommands(),
      )
    },
  )

  it.effect(
    'prerendered API startup retains its slice through failure and route retry',
    () => {
      const seededData = apiData

      return Story.story(
        application,
        Story.init(
          { ...flags, maybeApiData: Option.some(seededData) },
          commandApiUrl,
        ),
        resolveBrowserStartup(commandApiUrl),
        Story.model(model =>
          expect(model.apiReference.apiData).toEqual(
            ApiReference.ApiDataAsyncData.Refreshing({ data: seededData }),
          ),
        ),
        Story.Command.expectExact(LoadApiData),
        Story.Command.resolve(
          LoadApiData,
          ApiReferenceMessage.FailedLoadApiData({ error: 'Offline' }),
        ),
        Story.model(model =>
          expect(model.apiReference.apiData).toEqual(
            ApiReference.ApiDataAsyncData.Stale({
              data: seededData,
              error: 'Offline',
            }),
          ),
        ),
        Story.message(Message.ChangedUrl({ url: updateApiUrl })),
        Story.model(model =>
          expect(model.apiReference.apiData).toEqual(
            ApiReference.ApiDataAsyncData.Refreshing({ data: seededData }),
          ),
        ),
        Story.Command.expectHas(LoadApiData),
        ...resolvePathChangeCommands(),
        Story.Command.resolve(
          LoadApiData,
          ApiReferenceMessage.SucceededLoadApiData({ apiData }),
        ),
      )
    },
  )

  it.effect('remaining on a Playground slug preserves its Model', () => {
    return Story.story(
      application,
      Story.init(flags, playgroundCounterUrl),
      completeStartup(playgroundCounterUrl),
      Story.models(
        Story.steps(
          Story.message(
            Message.ChangedUrl({
              url: parseUrl(
                'https://foldkit.dev/playground/counter#src/block.ts',
              ),
            }),
          ),
        ),
        (before, after) =>
          expect(Option.getOrThrow(after.playground)).toBe(
            Option.getOrThrow(before.playground),
          ),
      ),
      Story.Command.expectExact(ScrollToAnchor),
      Story.Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
    )
  })

  it.effect('changing Playground slugs initializes a fresh Model', () => {
    return Story.story(
      application,
      Story.init(flags, playgroundCounterUrl),
      completeStartup(playgroundCounterUrl),
      Story.models(
        Story.steps(
          Story.message(Message.ChangedUrl({ url: playgroundCountersUrl })),
        ),
        (before, after) => {
          const nextPlayground = Option.getOrThrow(after.playground)
          expect(nextPlayground).not.toBe(Option.getOrThrow(before.playground))
          expect(nextPlayground.slug).toBe('counters')
        },
      ),
      ...resolvePathChangeCommands(),
    )
  })

  it.effect.each([
    { isPlaygroundSupported: true },
    { isPlaygroundSupported: false },
  ])(
    'entering Playground reuses cached browser support ($isPlaygroundSupported)',
    ({ isPlaygroundSupported }) =>
      Story.story(
        application,
        Story.init(flags, newsletterUrl),
        resolveBrowserStartup(
          newsletterUrl,
          flags.deployment,
          isPlaygroundSupported,
        ),
        resolveInitialData(),
        Story.message(Message.ChangedUrl({ url: playgroundCounterUrl })),
        Story.model(model =>
          expect(Option.getOrThrow(model.playground).maybeIsSupported).toEqual(
            Option.some(isPlaygroundSupported),
          ),
        ),
        ...resolvePathChangeCommands(),
      ),
  )

  it.effect('entering and exiting Playground adds and removes its Model', () =>
    Story.story(
      application,
      Story.init(flags, newsletterUrl),
      completeStartup(newsletterUrl),
      Story.message(Message.ChangedUrl({ url: playgroundCounterUrl })),
      Story.model(model =>
        expect(Option.getOrThrow(model.playground).slug).toBe('counter'),
      ),
      Story.Command.expectExact(ScrollToTop, ScrollSidebarActiveLinkIntoView),
      ...resolvePathChangeCommands(),
      Story.message(Message.ChangedUrl({ url: newsletterUrl })),
      Story.model(model => expect(Option.isNone(model.playground)).toBe(true)),
      Story.Command.expectExact(ScrollToTop, ScrollSidebarActiveLinkIntoView),
      ...resolvePathChangeCommands(),
    ),
  )

  it.effect.each([
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
    ({ initialUrl, urlWithHash }) =>
      Story.story(
        application,
        Story.init(flags, initialUrl),
        completeStartup(initialUrl),
        Story.message(Message.ChangedUrl({ url: urlWithHash })),
        Story.Command.expectExact(ScrollToAnchor),
        Story.Command.resolve(
          ScrollToAnchor,
          Message.CompletedScrollToAnchor(),
        ),
      ),
  )

  it.effect('route cleanup precedes scrolling to an anchor on a new path', () =>
    Story.story(
      application,
      Story.init(flags, newsletterUrl),
      completeStartup(newsletterUrl),
      Story.message(Message.ClickedOpenSearch()),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.Command.resolve(
        FocusSearchInput,
        SearchBlock.Message.CompletedFocusSearchInput(),
      ),
      Story.message(Message.ChangedUrl({ url: homeUrlWithHash })),
      Story.model(model => expect(model.search.dialog.isOpen).toBe(false)),
      Story.Command.expectExactInOrder(
        Dialog.test.CloseDialog({ id: 'search-dialog' }),
        ScrollToAnchor,
        ScrollSidebarActiveLinkIntoView,
      ),
      Story.Command.resolve(
        Dialog.test.CloseDialog({ id: 'search-dialog' }),
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Story.Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
      Story.Command.resolve(
        ScrollSidebarActiveLinkIntoView,
        Message.CompletedScrollSidebarActiveLinkIntoView(),
      ),
    ),
  )

  it.effect('changing API module slugs retries missing API data', () =>
    Story.story(
      application,
      Story.init(flags, commandApiUrl),
      resolveBrowserStartup(commandApiUrl),
      Story.Command.resolve(
        LoadApiData,
        ApiReferenceMessage.FailedLoadApiData({ error: 'failed' }),
      ),
      Story.message(Message.ChangedUrl({ url: updateApiUrl })),
      Story.model(model =>
        expect(model.apiReference.apiData._tag).toBe('Loading'),
      ),
      Story.Command.expectHas(LoadApiData),
      ...resolvePathChangeCommands(),
      Story.Command.resolve(
        LoadApiData,
        ApiReferenceMessage.SucceededLoadApiData({ apiData }),
      ),
    ),
  )

  it.effect('changing example slugs requests the next example sources', () =>
    Story.story(
      application,
      Story.init(flags, counterExampleUrl),
      resolveBrowserStartup(counterExampleUrl),
      Story.Command.resolve(
        LoadApiData,
        ApiReferenceMessage.SucceededLoadApiData({ apiData }),
      ),
      Story.Command.resolve(
        LoadExampleSources,
        ExampleDetailMessage.FailedLoadExampleSources({ error: 'failed' }),
      ),
      Story.message(Message.ChangedUrl({ url: countersExampleUrl })),
      Story.model(model =>
        expect(model.exampleDetail.currentSources._tag).toBe('Loading'),
      ),
      Story.Command.expectHas(LoadExampleSources({ slug: 'counters' })),
      ...resolvePathChangeCommands(),
      Story.Command.resolve(
        LoadExampleSources,
        ExampleDetailMessage.SucceededLoadExampleSources({
          sources: { files: [] },
        }),
      ),
    ),
  )
  it.effect(
    'newsletter email follows navigation between Home and Newsletter',
    () =>
      Story.story(
        application,
        Story.init(flags, homeUrl),
        completeStartup(homeUrl),
        Story.messageIn(
          MaybeHomeBinding,
          HomeBlock.Message.UpdatedNewsletterEmail({
            value: 'alice@example.com',
          }),
        ),
        Story.model(model =>
          expect(model.newsletterEmail).toBe('alice@example.com'),
        ),
        Story.message(Message.ChangedUrl({ url: newsletterUrl })),
        ...resolvePathChangeCommands(),
        Story.model(model =>
          expect(model.newsletterEmail).toBe('alice@example.com'),
        ),
        Story.message(
          Message.UpdatedNewsletterEmail({ value: 'bob@example.com' }),
        ),
        Story.model(model =>
          expect(model.newsletterEmail).toBe('bob@example.com'),
        ),
        Story.message(Message.ChangedUrl({ url: homeUrl })),
        ...resolvePathChangeCommands(),
        Story.model(model =>
          expect(model.newsletterEmail).toBe('bob@example.com'),
        ),
      ),
  )

  it.effect('entering Home initializes fresh state', () =>
    Story.story(
      application,
      Story.init(flags, newsletterUrl),
      completeStartup(newsletterUrl),
      Story.model(expectHomeAbsent),
      Story.message(Message.ChangedUrl({ url: homeUrl })),
      Story.model(model => {
        expectHomePresent(model)
        expectDefaultHome(Option.getOrThrow(model.maybeHome))
      }),
      ...resolvePathChangeCommands(),
    ),
  )

  it.effect('leaving Home removes the Home Block', () =>
    Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.model(expectHomePresent),
      Story.message(Message.ChangedUrl({ url: newsletterUrl })),
      Story.model(expectHomeAbsent),
      ...resolvePathChangeCommands(),
    ),
  )

  it.effect('remaining on Home preserves the existing Home Model', () => {
    return Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.models(
        Story.steps(Story.message(Message.ChangedUrl({ url: homeUrl }))),
        (before, after) =>
          expect(Option.getOrThrow(after.maybeHome)).toBe(
            Option.getOrThrow(before.maybeHome),
          ),
      ),
      Story.Command.expectNone(),
    )
  })
  it.effect('returning to Home initializes fresh default state', () =>
    Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.messageIn(
        [MaybeHomeBinding, NotePlayerDemoBinding],
        NotePlayerDemoBlock.Message.ChangedNoteInput({ value: 'ABC' }),
      ),
      Story.model((model: Model) => {
        expect(
          Option.getOrThrow(model.maybeHome).notePlayerDemo.noteInput.value,
        ).toBe('ABC')
      }),
      Story.message(Message.ChangedUrl({ url: newsletterUrl })),
      ...resolvePathChangeCommands(),
      Story.message(Message.ChangedUrl({ url: homeUrl })),
      Story.model(model => {
        expectHomePresent(model)
        expectDefaultHome(Option.getOrThrow(model.maybeHome))
      }),
      ...resolvePathChangeCommands(),
    ),
  )
  it.effect('late Home Messages are ignored while Home is absent', () =>
    Story.story(
      application,
      Story.init(flags, newsletterUrl),
      completeStartup(newsletterUrl),
      Story.messageIn(
        [MaybeHomeBinding, NotePlayerDemoBinding],
        NotePlayerDemoBlock.Message.ChangedNoteInput({ value: 'ABC' }),
      ),
      Story.model(model => {
        expectHomeAbsent(model)
      }),
      Story.Command.expectNone(),
    ),
  )
  it.effect('Home playground selections load a fresh document', () =>
    Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.messageIn(
        [MaybeHomeBinding, PlaygroundMenuBinding],
        ThemeMenuBlock.Message.SelectedItem({
          index: 0,
          item: 'counter',
        }),
      ),
      Story.Command.resolve(LoadPlayground, Message.CompletedLoadPlayground()),
    ),
  )
  it.effect('the parent opens Search through its child update capability', () =>
    Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.message(Message.ClickedOpenSearch()),
      Story.model(model => expect(model.search.dialog.isOpen).toBe(true)),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.Command.resolve(
        FocusSearchInput,
        SearchBlock.Message.CompletedFocusSearchInput(),
      ),
    ),
  )

  it.effect('the parent delegates snippet copying to the child Block', () => {
    const snippetId = 'root-story-snippet'

    return Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.messageIn(
        SnippetCopyBinding,
        SnippetCopyBlock.Message.ClickedCopySnippet({
          snippetId,
          text: 'const count = 0',
        }),
      ),
      Story.Command.resolve(
        CopySnippet,
        SnippetCopyBlock.Message.SucceededCopySnippet({ snippetId }),
      ),
      Story.model(model =>
        expect(HashSet.has(model.snippetCopy.copiedSnippetIds, snippetId)).toBe(
          true,
        ),
      ),
      Story.Command.resolve(
        WaitBeforeHidingCopiedIndicator,
        SnippetCopyBlock.Message.CompletedWaitBeforeHidingCopiedIndicator({
          snippetId,
        }),
      ),
    )
  })

  it.effect('the parent owns each snippet disclosure state', () => {
    const disclosureId = 'root-story-snippet'

    return Story.story(
      application,
      Story.init(flags, homeUrl),
      completeStartup(homeUrl),
      Story.messageIn(
        SnippetDisclosureBinding,
        SnippetDisclosureBlock.Message.ToggledCodeDisclosure({
          disclosureId,
          isOpen: true,
        }),
      ),
      Story.model(model =>
        expect(
          HashSet.has(model.snippetDisclosure.openDisclosureIds, disclosureId),
        ).toBe(true),
      ),
    )
  })
})
