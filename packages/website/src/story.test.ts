import { Array, HashSet, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import {
  Command,
  type StorySimulation,
  type TestBlock,
  given,
  init,
  message,
  messageFrom,
  model,
  models,
  steps,
  story,
  withBlock,
} from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'
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

type ApplicationSimulation = StorySimulation<
  Model,
  TestBlock<typeof application>['Message']['Type']
>

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
  Command.resolve(ScrollToTop, Message.CompletedScrollToTop()),
  Command.resolve(
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
  steps(
    Command.resolve(
      LoadBrowserEnvironment,
      browserEnvironment(isPlaygroundSupported),
    ),
    Command.resolve(ApplyTheme, Message.CompletedApplyTheme()),
    ...(isTelemetryEnabled(deployment)
      ? [
          Command.resolve(InjectAnalytics, Message.CompletedInjectAnalytics()),
          Command.resolve(
            InjectSpeedInsights,
            Message.CompletedInjectSpeedInsights(),
          ),
        ]
      : []),
    Command.resolve(
      ScrollSidebarActiveLinkIntoView,
      Message.CompletedScrollSidebarActiveLinkIntoView(),
    ),
    ...Option.match(url.hash, {
      onNone: () => [],
      onSome: hash => [
        Command.resolve(
          ScrollToAnchor({ hash }),
          Message.CompletedScrollToAnchor(),
        ),
      ],
    }),
  )
const resolveInitialData = () =>
  Command.resolveAll(
    [LoadApiData, ApiReferenceMessage.SucceededLoadApiData({ apiData })],
    [
      LoadExampleSources,
      ExampleDetailMessage.SucceededLoadExampleSources({
        sources: { files: [] },
      }),
    ],
  )
const completeStartup = (url: Url.Url) =>
  steps(resolveBrowserStartup(url), resolveInitialData())

const makeFixture = (block: TestBlock<typeof application>) => {
  const update = block.update
  const toParentMessage = toParentMessageFor(block)
  const toHomeMessage = toParentMessageFor(block, MaybeHomeBinding)

  return { update, toParentMessage, toHomeMessage }
}

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

      return story(
        application,
        init({ ...flags, deployment }, counterExampleUrl),
        Command.expectExact(...startupCommands),
        (simulation: ApplicationSimulation) => {
          for (const [pending, definition] of Array.zip(
            simulation.commands,
            startupCommands,
          )) {
            expect(Option.isSome(Command.argsOf(definition)(pending))).toBe(
              true,
            )
          }
          return simulation
        },
        resolveBrowserStartup(counterExampleUrl, deployment),
        resolveInitialData(),
      )
    },
  )

  it.effect('startup includes the initial anchor in its root Commands', () => {
    const startupCommands = [
      LoadBrowserEnvironment,
      ScrollSidebarActiveLinkIntoView,
      ScrollToAnchor,
      LoadApiData,
      LoadExampleSources,
    ]

    return story(
      application,
      init(flags, counterExampleUrlWithHash),
      Command.expectExact(
        LoadBrowserEnvironment,
        ScrollSidebarActiveLinkIntoView,
        ScrollToAnchor({ hash: 'application' }),
        LoadApiData,
        LoadExampleSources,
      ),
      (simulation: ApplicationSimulation) => {
        for (const [pending, definition] of Array.zip(
          simulation.commands,
          startupCommands,
        )) {
          expect(Option.isSome(Command.argsOf(definition)(pending))).toBe(true)
        }
        return simulation
      },
      resolveBrowserStartup(counterExampleUrlWithHash),
      resolveInitialData(),
    )
  })

  it.effect('navigation opens an existing closed sidebar group', () => {
    return story(
      application,
      init(flags, homeUrl),
      completeStartup(homeUrl),
      model(model => {
        expect(model.sidebarGroups.apiReference).toBe(false)
      }),
      models(
        steps(message(Message.ChangedUrl({ url: commandApiUrl }))),
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
      return story(
        application,
        init(flags, commandApiUrl),
        completeStartup(commandApiUrl),
        model(model => {
          expect(model.sidebarGroups.apiReference).toBe(true)
        }),
        models(
          steps(message(Message.ChangedUrl({ url: updateApiUrl }))),
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

      return story(
        application,
        init(
          { ...flags, maybeApiData: Option.some(seededData) },
          commandApiUrl,
        ),
        resolveBrowserStartup(commandApiUrl),
        model(model =>
          expect(model.apiReference.apiData).toEqual(
            ApiReference.ApiDataAsyncData.Refreshing({ data: seededData }),
          ),
        ),
        Command.expectExact(LoadApiData),
        Command.resolve(
          LoadApiData,
          ApiReferenceMessage.FailedLoadApiData({ error: 'Offline' }),
        ),
        model(model =>
          expect(model.apiReference.apiData).toEqual(
            ApiReference.ApiDataAsyncData.Stale({
              data: seededData,
              error: 'Offline',
            }),
          ),
        ),
        message(Message.ChangedUrl({ url: updateApiUrl })),
        model(model =>
          expect(model.apiReference.apiData).toEqual(
            ApiReference.ApiDataAsyncData.Refreshing({ data: seededData }),
          ),
        ),
        Command.expectHas(LoadApiData),
        ...resolvePathChangeCommands(),
        Command.resolve(
          LoadApiData,
          ApiReferenceMessage.SucceededLoadApiData({ apiData }),
        ),
      )
    },
  )

  it.effect('remaining on a Playground slug preserves its Model', () => {
    return story(
      application,
      init(flags, playgroundCounterUrl),
      completeStartup(playgroundCounterUrl),
      models(
        steps(
          message(
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
      Command.expectExact(ScrollToAnchor),
      Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
    )
  })

  it.effect('changing Playground slugs initializes a fresh Model', () => {
    return story(
      application,
      init(flags, playgroundCounterUrl),
      completeStartup(playgroundCounterUrl),
      models(
        steps(message(Message.ChangedUrl({ url: playgroundCountersUrl }))),
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
      story(
        application,
        init(flags, newsletterUrl),
        resolveBrowserStartup(
          newsletterUrl,
          flags.deployment,
          isPlaygroundSupported,
        ),
        resolveInitialData(),
        message(Message.ChangedUrl({ url: playgroundCounterUrl })),
        model(model =>
          expect(Option.getOrThrow(model.playground).maybeIsSupported).toEqual(
            Option.some(isPlaygroundSupported),
          ),
        ),
        ...resolvePathChangeCommands(),
      ),
  )

  it.effect('entering and exiting Playground adds and removes its Model', () =>
    story(
      application,
      init(flags, newsletterUrl),
      completeStartup(newsletterUrl),
      message(Message.ChangedUrl({ url: playgroundCounterUrl })),
      model(model =>
        expect(Option.getOrThrow(model.playground).slug).toBe('counter'),
      ),
      Command.expectExact(ScrollToTop, ScrollSidebarActiveLinkIntoView),
      ...resolvePathChangeCommands(),
      message(Message.ChangedUrl({ url: newsletterUrl })),
      model(model => expect(Option.isNone(model.playground)).toBe(true)),
      Command.expectExact(ScrollToTop, ScrollSidebarActiveLinkIntoView),
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
      story(
        application,
        init(flags, initialUrl),
        completeStartup(initialUrl),
        message(Message.ChangedUrl({ url: urlWithHash })),
        Command.expectExact(ScrollToAnchor),
        Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
      ),
  )

  it.effect('route cleanup precedes scrolling to an anchor on a new path', () =>
    story(
      application,
      init(flags, newsletterUrl),
      completeStartup(newsletterUrl),
      message(Message.ClickedOpenSearch()),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Command.resolve(
        FocusSearchInput,
        SearchBlock.Message.CompletedFocusSearchInput(),
      ),
      message(Message.ChangedUrl({ url: homeUrlWithHash })),
      model(model => expect(model.search.dialog.isOpen).toBe(false)),
      Command.expectExact(
        Dialog.test.CloseDialog({ id: 'search-dialog' }),
        ScrollToAnchor,
        ScrollSidebarActiveLinkIntoView,
      ),
      (simulation: ApplicationSimulation) => {
        for (const [pending, definition] of Array.zip(simulation.commands, [
          Dialog.test.CloseDialog,
          ScrollToAnchor,
          ScrollSidebarActiveLinkIntoView,
        ])) {
          expect(Option.isSome(Command.argsOf(definition)(pending))).toBe(true)
        }
        return simulation
      },
      Command.resolve(
        Dialog.test.CloseDialog({ id: 'search-dialog' }),
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
      Command.resolve(
        ScrollSidebarActiveLinkIntoView,
        Message.CompletedScrollSidebarActiveLinkIntoView(),
      ),
    ),
  )

  it.effect('changing API module slugs retries missing API data', () =>
    story(
      application,
      init(flags, commandApiUrl),
      resolveBrowserStartup(commandApiUrl),
      Command.resolve(
        LoadApiData,
        ApiReferenceMessage.FailedLoadApiData({ error: 'failed' }),
      ),
      message(Message.ChangedUrl({ url: updateApiUrl })),
      model(model => expect(model.apiReference.apiData._tag).toBe('Loading')),
      Command.expectHas(LoadApiData),
      ...resolvePathChangeCommands(),
      Command.resolve(
        LoadApiData,
        ApiReferenceMessage.SucceededLoadApiData({ apiData }),
      ),
    ),
  )

  it.effect('changing example slugs requests the next example sources', () =>
    story(
      application,
      init(flags, counterExampleUrl),
      resolveBrowserStartup(counterExampleUrl),
      Command.resolve(
        LoadApiData,
        ApiReferenceMessage.SucceededLoadApiData({ apiData }),
      ),
      Command.resolve(
        LoadExampleSources,
        ExampleDetailMessage.FailedLoadExampleSources({ error: 'failed' }),
      ),
      message(Message.ChangedUrl({ url: countersExampleUrl })),
      model(model =>
        expect(model.exampleDetail.currentSources._tag).toBe('Loading'),
      ),
      Command.expectHas(LoadExampleSources({ slug: 'counters' })),
      ...resolvePathChangeCommands(),
      Command.resolve(
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
      story(
        application,
        init(flags, homeUrl),
        completeStartup(homeUrl),
        messageFrom(
          MaybeHomeBinding,
          HomeBlock.Message.UpdatedNewsletterEmail({
            value: 'alice@example.com',
          }),
        ),
        model(model => expect(model.newsletterEmail).toBe('alice@example.com')),
        message(Message.ChangedUrl({ url: newsletterUrl })),
        ...resolvePathChangeCommands(),
        model(model => expect(model.newsletterEmail).toBe('alice@example.com')),
        message(Message.UpdatedNewsletterEmail({ value: 'bob@example.com' })),
        model(model => expect(model.newsletterEmail).toBe('bob@example.com')),
        message(Message.ChangedUrl({ url: homeUrl })),
        ...resolvePathChangeCommands(),
        model(model => expect(model.newsletterEmail).toBe('bob@example.com')),
      ),
  )

  it.effect('entering Home initializes fresh state', () =>
    story(
      application,
      init(flags, newsletterUrl),
      completeStartup(newsletterUrl),
      model(expectHomeAbsent),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expectHomePresent(model)
        expectDefaultHome(Option.getOrThrow(model.maybeHome))
      }),
      ...resolvePathChangeCommands(),
    ),
  )

  it.effect('leaving Home removes the Home Block', () =>
    story(
      application,
      init(flags, homeUrl),
      completeStartup(homeUrl),
      model(expectHomePresent),
      message(Message.ChangedUrl({ url: newsletterUrl })),
      model(expectHomeAbsent),
      ...resolvePathChangeCommands(),
    ),
  )

  it.effect('remaining on Home preserves the existing Home Model', () => {
    return story(
      application,
      init(flags, homeUrl),
      completeStartup(homeUrl),
      models(
        steps(message(Message.ChangedUrl({ url: homeUrl }))),
        (before, after) =>
          expect(Option.getOrThrow(after.maybeHome)).toBe(
            Option.getOrThrow(before.maybeHome),
          ),
      ),
      Command.expectNone(),
    )
  })
  it.effect('returning to Home initializes fresh default state', () =>
    withBlock(application, executable => {
      const { update, toParentMessage, toHomeMessage } = makeFixture(executable)
      const initAt = (url: Url.Url) => executable.init(flags, url).model

      story(
        update,
        given(initAt(homeUrl)),
        message(
          toParentMessage(
            MaybeHomeBinding,
            toHomeMessage(
              NotePlayerDemoBinding,
              NotePlayerDemoBlock.Message.ChangedNoteInput({ value: 'ABC' }),
            ),
          ),
        ),
        model((model: Model) => {
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
    }),
  )
  it.effect('late Home Messages are ignored while Home is absent', () =>
    withBlock(application, executable => {
      const { update, toParentMessage, toHomeMessage } = makeFixture(executable)
      const initAt = (url: Url.Url) => executable.init(flags, url).model

      story(
        update,
        given(initAt(newsletterUrl)),
        message(
          toParentMessage(
            MaybeHomeBinding,
            toHomeMessage(
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
    }),
  )
  it.effect('Home playground selections load a fresh document', () =>
    withBlock(application, executable => {
      const { update, toParentMessage, toHomeMessage } = makeFixture(executable)
      const initAt = (url: Url.Url) => executable.init(flags, url).model

      story(
        update,
        given(initAt(homeUrl)),
        message(
          toParentMessage(
            MaybeHomeBinding,
            toHomeMessage(
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
    }),
  )
  it.effect('the parent opens Search through its child update capability', () =>
    story(
      application,
      init(flags, homeUrl),
      completeStartup(homeUrl),
      message(Message.ClickedOpenSearch()),
      model(model => expect(model.search.dialog.isOpen).toBe(true)),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Command.resolve(
        FocusSearchInput,
        SearchBlock.Message.CompletedFocusSearchInput(),
      ),
    ),
  )

  it.effect('the parent delegates snippet copying to the child Block', () => {
    const snippetId = 'root-story-snippet'

    return story(
      application,
      init(flags, homeUrl),
      completeStartup(homeUrl),
      messageFrom(
        SnippetCopyBinding,
        SnippetCopyBlock.Message.ClickedCopySnippet({
          snippetId,
          text: 'const count = 0',
        }),
      ),
      Command.resolve(
        CopySnippet,
        SnippetCopyBlock.Message.SucceededCopySnippet({ snippetId }),
      ),
      model(model =>
        expect(HashSet.has(model.snippetCopy.copiedSnippetIds, snippetId)).toBe(
          true,
        ),
      ),
      Command.resolve(
        WaitBeforeHidingCopiedIndicator,
        SnippetCopyBlock.Message.CompletedWaitBeforeHidingCopiedIndicator({
          snippetId,
        }),
      ),
    )
  })

  it.effect('the parent owns each snippet disclosure state', () => {
    const disclosureId = 'root-story-snippet'

    return story(
      application,
      init(flags, homeUrl),
      completeStartup(homeUrl),
      messageFrom(
        SnippetDisclosureBinding,
        SnippetDisclosureBlock.Message.ToggledCodeDisclosure({
          disclosureId,
          isOpen: true,
        }),
      ),
      model(model =>
        expect(
          HashSet.has(model.snippetDisclosure.openDisclosureIds, disclosureId),
        ).toBe(true),
      ),
    )
  })
})
