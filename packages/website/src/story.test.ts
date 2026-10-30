import { HashSet, Layer, Option, pipe } from 'effect'
import { Block, Calendar } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'
import * as Url from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'
import { test as DialogTest } from '@foldkit/ui/dialog'

import { ApplicationLive } from './block'
import {
  LoadPlayground,
  ScrollSidebarActiveLinkIntoView,
  ScrollToAnchor,
  ScrollToTop,
} from './command'
import { Deployment } from './deployment'
import { type Flags } from './flags'
import { Message } from './message'
import { ApiReference, ExampleDetail, Home, Playground } from './page'
import { LoadApiData } from './page/apiReference/command'
import * as ApiReferenceDomain from './page/apiReference/domain'
import { LoadExampleSources } from './page/example/example'
import { NotePlayerDemo } from './page/home/notePlayerDemo'
import { AcquireAudioContext } from './page/home/notePlayerDemo/notePlayerDemo'
import { PlaygroundMenu } from './page/home/playgroundMenu'
import { Search } from './search'
import { FocusSearchInput } from './search/command'
import { ApplicationServerLayer } from './services'
import { SnippetCopy } from './snippetCopy'
import {
  CopySnippet,
  WaitBeforeHidingCopiedIndicator,
} from './snippetCopy/command'
import { SnippetDisclosure } from './snippetDisclosure'
import { ApplyTheme } from './theme'

const ApplicationTest = ApplicationLive.pipe(
  Layer.provide(ApplicationServerLayer),
)

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
const flags: Flags = {
  currentYear: 2026,
  today: Calendar.make(2026, 8, 30),
  deployment: Deployment.Canary({ commit: 'test' }),
  maybeApiData: Option.none(),
  maybeExampleSources: Option.none(),
}
const startAt = (url: Url.Url) => ({ flags, url })

const resolvePathChangeCommands = [
  Command.resolve(ScrollToTop, Message.CompletedScrollToTop()),
  Command.resolve(
    ScrollSidebarActiveLinkIntoView,
    Message.CompletedScrollSidebarActiveLinkIntoView(),
  ),
]

const resolveAcquireAudioContext = Command.resolve(
  AcquireAudioContext,
  NotePlayerDemo.Message.SucceededAcquireAudioContext(),
)

const resolveCloseDialog = Command.resolve(
  DialogTest.CloseDialog,
  Dialog.Dialog.Message.CompletedCloseDialog(),
)

const deliverToNotePlayer = (
  notePlayerMessage: typeof NotePlayerDemo.Message.Type,
) =>
  message(
    Block.deliver(
      NotePlayerDemo,
      ['maybeHome', 'notePlayerDemo'],
      notePlayerMessage,
    ),
  )

const expectDefaultHome = (
  maybeHome: Option.Option<
    Readonly<{
      activeDemoTab: string
      asyncCounterDemo: Readonly<{ count: number }>
      notePlayerDemo: Readonly<{
        noteInput: Readonly<{ value: string }>
        playbackState: Readonly<{ _tag: string }>
      }>
    }>
  >,
): void => {
  const home = Option.getOrThrow(maybeHome)
  expect(home.activeDemoTab).toBe('AsyncCounter')
  expect(home.asyncCounterDemo.count).toBe(0)
  expect(home.notePlayerDemo.noteInput.value).toBe('CDEFGABC')
  expect(home.notePlayerDemo.playbackState._tag).toBe('Idle')
}

describe('application', () => {
  it.effect('navigation opens an existing closed sidebar group', () => {
    const initialGroups: Array<boolean> = []

    return story(
      ApplicationTest,
      startAt(homeUrl),
      model(model => {
        expect(model.sidebarGroups.apiReference).toBe(false)
        initialGroups.push(model.sidebarGroups.examples)
      }),
      message(Message.ChangedUrl({ url: commandApiUrl })),
      model(model => {
        expect(model.sidebarGroups.apiReference).toBe(true)
        expect([model.sidebarGroups.examples]).toEqual(initialGroups)
      }),
      ...resolvePathChangeCommands,
      Command.expectNone(),
    )
  })

  it.effect('navigation within an open sidebar group preserves its state', () =>
    story(
      ApplicationTest,
      startAt(commandApiUrl),
      model(model => {
        expect(model.sidebarGroups.apiReference).toBe(true)
      }),
      message(Message.ChangedUrl({ url: updateApiUrl })),
      model(model => {
        expect(model.sidebarGroups.apiReference).toBe(true)
      }),
      ...resolvePathChangeCommands,
    ),
  )

  it.effect(
    'prerendered API startup retains its slice through failure and route retry',
    () => {
      const seededData = ApiReferenceDomain.ApiData.make({
        parsedApi: { modules: [] },
        highlights: {},
      })

      return story(
        ApplicationTest,
        {
          flags: { ...flags, maybeApiData: Option.some(seededData) },
          url: commandApiUrl,
        },
        model(model => {
          expect(model.apiReference.apiData).toEqual(
            ApiReferenceDomain.ApiDataAsyncData.Refreshing({
              data: seededData,
            }),
          )
        }),
        message(
          Block.deliver(
            ApiReference,
            'apiReference',
            ApiReference.Message.FailedLoadApiData({ error: 'Offline' }),
          ),
        ),
        model(model => {
          expect(model.apiReference.apiData).toEqual(
            ApiReferenceDomain.ApiDataAsyncData.Stale({
              data: seededData,
              error: 'Offline',
            }),
          )
        }),
        message(Message.ChangedUrl({ url: updateApiUrl })),
        model(model => {
          expect(model.apiReference.apiData).toEqual(
            ApiReferenceDomain.ApiDataAsyncData.Refreshing({
              data: seededData,
            }),
          )
        }),
        Command.expectHas(LoadApiData),
        Command.resolve(
          LoadApiData,
          ApiReference.Message.FailedLoadApiData({ error: 'Offline' }),
        ),
        ...resolvePathChangeCommands,
      )
    },
  )

  it.effect('remaining on a Playground slug preserves its Model', () =>
    story(
      ApplicationTest,
      startAt(playgroundCounterUrl),
      message(
        Block.deliver(
          Playground,
          ['playground', 'counter'],
          Playground.Message.EditedPlaygroundFile({
            path: 'src/application.ts',
            content: 'edited',
          }),
        ),
      ),
      message(
        Message.ChangedUrl({
          url: parseUrl(
            'https://foldkit.dev/playground/counter#src/application.ts',
          ),
        }),
      ),
      model(model => {
        expect(
          Option.getOrThrow(model.playground).files['src/application.ts'],
        ).toBe('edited')
      }),
      Command.expectExact(ScrollToAnchor),
      Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
    ),
  )

  it.effect('changing Playground slugs initializes a fresh Model', () =>
    story(
      ApplicationTest,
      startAt(playgroundCounterUrl),
      message(Message.ChangedUrl({ url: playgroundCountersUrl })),
      model(model => {
        expect(Option.getOrThrow(model.playground).slug).toBe('counters')
      }),
      ...resolvePathChangeCommands,
    ),
  )

  it.effect.each([
    { isPlaygroundSupported: true },
    { isPlaygroundSupported: false },
  ])(
    'entering Playground reuses cached browser support ($isPlaygroundSupported)',
    ({ isPlaygroundSupported }) =>
      story(
        ApplicationTest,
        startAt(newsletterUrl),
        message(
          Message.CompletedLoadBrowserEnvironment({
            maybeThemePreference: Option.none(),
            maybeSidebarState: Option.none(),
            systemTheme: 'Light',
            isPlaygroundSupported,
            currentYear: flags.currentYear,
            today: flags.today,
          }),
        ),
        Command.resolve(ApplyTheme, Message.CompletedApplyTheme()),
        message(Message.ChangedUrl({ url: playgroundCounterUrl })),
        model(model => {
          expect(Option.getOrThrow(model.playground).maybeIsSupported).toEqual(
            Option.some(isPlaygroundSupported),
          )
        }),
        ...resolvePathChangeCommands,
      ),
  )

  it.effect('entering and exiting Playground adds and removes its Model', () =>
    story(
      ApplicationTest,
      startAt(newsletterUrl),
      message(Message.ChangedUrl({ url: playgroundCounterUrl })),
      model(model => {
        expect(Option.getOrThrow(model.playground).slug).toBe('counter')
      }),
      Command.expectExact(ScrollToTop, ScrollSidebarActiveLinkIntoView),
      ...resolvePathChangeCommands,
      message(Message.ChangedUrl({ url: newsletterUrl })),
      model(model => {
        expect(Option.isNone(model.playground)).toBe(true)
      }),
      Command.expectExact(ScrollToTop, ScrollSidebarActiveLinkIntoView),
      ...resolvePathChangeCommands,
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
        ApplicationTest,
        startAt(initialUrl),
        message(Message.ChangedUrl({ url: urlWithHash })),
        Command.expectExact(ScrollToAnchor),
        Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
      ),
  )

  it.effect('route cleanup precedes scrolling to an anchor on a new path', () =>
    story(
      ApplicationTest,
      startAt(newsletterUrl),
      message(Message.ClickedOpenSearch()),
      Command.resolve(
        FocusSearchInput,
        Search.Message.CompletedFocusSearchInput(),
      ),
      Command.resolve(
        DialogTest.ShowDialog,
        Dialog.Dialog.Message.SucceededShowDialog(),
      ),
      message(Message.ChangedUrl({ url: homeUrlWithHash })),
      model(model => {
        expect(model.search.dialog.isOpen).toBe(false)
      }),
      Command.expectHas(
        DialogTest.CloseDialog,
        ScrollToAnchor,
        ScrollSidebarActiveLinkIntoView,
      ),
      resolveCloseDialog,
      Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
      Command.resolve(
        ScrollSidebarActiveLinkIntoView,
        Message.CompletedScrollSidebarActiveLinkIntoView(),
      ),
      resolveAcquireAudioContext,
    ),
  )

  it.effect('changing API module slugs retries missing API data', () =>
    story(
      ApplicationTest,
      startAt(commandApiUrl),
      message(
        Block.deliver(
          ApiReference,
          'apiReference',
          ApiReference.Message.FailedLoadApiData({ error: 'failed' }),
        ),
      ),
      message(Message.ChangedUrl({ url: updateApiUrl })),
      model(model => {
        expect(model.apiReference.apiData._tag).toBe('Loading')
      }),
      Command.expectHas(LoadApiData),
      Command.resolve(
        LoadApiData,
        ApiReference.Message.FailedLoadApiData({ error: 'failed' }),
      ),
      ...resolvePathChangeCommands,
    ),
  )

  it.effect('changing example slugs requests the next example sources', () =>
    story(
      ApplicationTest,
      startAt(counterExampleUrl),
      message(
        Block.deliver(
          ExampleDetail,
          'exampleDetail',
          ExampleDetail.Message.FailedLoadExampleSources({ error: 'failed' }),
        ),
      ),
      message(Message.ChangedUrl({ url: countersExampleUrl })),
      model(model => {
        expect(model.exampleDetail.currentSources._tag).toBe('Loading')
      }),
      Command.expectHas(LoadExampleSources),
      Command.resolve(
        LoadExampleSources,
        ExampleDetail.Message.FailedLoadExampleSources({ error: 'failed' }),
      ),
      ...resolvePathChangeCommands,
    ),
  )

  it.effect(
    'newsletter email follows navigation between Home and Newsletter',
    () =>
      story(
        ApplicationTest,
        startAt(homeUrl),
        message(
          Block.deliver(
            Home,
            'maybeHome',
            Home.Message.UpdatedNewsletterEmail({ value: 'alice@example.com' }),
          ),
        ),
        model(model => {
          expect(model.newsletterEmail).toBe('alice@example.com')
        }),
        message(Message.ChangedUrl({ url: newsletterUrl })),
        ...resolvePathChangeCommands,
        model(model => {
          expect(model.newsletterEmail).toBe('alice@example.com')
        }),
        message(Message.UpdatedNewsletterEmail({ value: 'bob@example.com' })),
        model(model => {
          expect(model.newsletterEmail).toBe('bob@example.com')
        }),
        message(Message.ChangedUrl({ url: homeUrl })),
        ...resolvePathChangeCommands,
        resolveAcquireAudioContext,
        model(model => {
          expect(model.newsletterEmail).toBe('bob@example.com')
        }),
      ),
  )

  it.effect('entering Home initializes fresh state', () =>
    story(
      ApplicationTest,
      startAt(newsletterUrl),
      model(model => {
        expect(Option.isNone(model.maybeHome)).toBe(true)
      }),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expectDefaultHome(model.maybeHome)
      }),
      ...resolvePathChangeCommands,
      resolveAcquireAudioContext,
    ),
  )

  it.effect('leaving Home removes the Home Block', () =>
    story(
      ApplicationTest,
      startAt(homeUrl),
      model(model => {
        expect(Option.isSome(model.maybeHome)).toBe(true)
      }),
      message(Message.ChangedUrl({ url: newsletterUrl })),
      model(model => {
        expect(Option.isNone(model.maybeHome)).toBe(true)
      }),
      ...resolvePathChangeCommands,
    ),
  )

  it.effect('remaining on Home preserves the existing Home Model', () =>
    story(
      ApplicationTest,
      startAt(homeUrl),
      deliverToNotePlayer(
        NotePlayerDemo.Message.ChangedNoteInput({ value: 'ABC' }),
      ),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expect(
          Option.getOrThrow(model.maybeHome).notePlayerDemo.noteInput.value,
        ).toBe('ABC')
      }),
    ),
  )

  it.effect('returning to Home initializes fresh default state', () =>
    story(
      ApplicationTest,
      startAt(homeUrl),
      deliverToNotePlayer(
        NotePlayerDemo.Message.ChangedNoteInput({ value: 'ABC' }),
      ),
      model(model => {
        expect(
          Option.getOrThrow(model.maybeHome).notePlayerDemo.noteInput.value,
        ).toBe('ABC')
      }),
      message(Message.ChangedUrl({ url: newsletterUrl })),
      ...resolvePathChangeCommands,
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expectDefaultHome(model.maybeHome)
      }),
      ...resolvePathChangeCommands,
      resolveAcquireAudioContext,
    ),
  )

  it.effect('late Home Messages are ignored while Home is absent', () =>
    story(
      ApplicationTest,
      startAt(newsletterUrl),
      deliverToNotePlayer(
        NotePlayerDemo.Message.ChangedNoteInput({ value: 'ABC' }),
      ),
      model(model => {
        expect(Option.isNone(model.maybeHome)).toBe(true)
      }),
      Command.expectNone(),
    ),
  )

  it.effect('Home playground selections load a fresh document', () =>
    story(
      ApplicationTest,
      startAt(homeUrl),
      message(
        Block.deliver(
          PlaygroundMenu,
          ['maybeHome', 'playgroundMenu'],
          PlaygroundMenu.Message.SelectedItem({ index: 0, item: 'counter' }),
        ),
      ),
      Command.expectHas(LoadPlayground),
      Command.resolve(LoadPlayground, Message.CompletedLoadPlayground()),
    ),
  )

  it.effect('the parent opens Search by sending it a Message', () =>
    story(
      ApplicationTest,
      startAt(homeUrl),
      message(Message.ClickedOpenSearch()),
      model(model => {
        expect(model.search.dialog.isOpen).toBe(true)
      }),
      Command.resolve(
        DialogTest.ShowDialog,
        Dialog.Dialog.Message.SucceededShowDialog(),
      ),
      Command.resolve(
        FocusSearchInput,
        Search.Message.CompletedFocusSearchInput(),
      ),
    ),
  )

  it.effect('the snippet copy child owns copied snippet state', () => {
    const snippetId = 'root-story-snippet'

    return story(
      ApplicationTest,
      startAt(homeUrl),
      message(
        Block.deliver(
          SnippetCopy,
          'snippetCopy',
          SnippetCopy.Message.ClickedCopySnippet({
            snippetId,
            text: 'const count = 0',
          }),
        ),
      ),
      Command.resolve(
        CopySnippet,
        SnippetCopy.Message.SucceededCopySnippet({ snippetId }),
      ),
      model(model => {
        expect(HashSet.has(model.snippetCopy.copiedSnippetIds, snippetId)).toBe(
          true,
        )
      }),
      Command.resolve(
        WaitBeforeHidingCopiedIndicator,
        SnippetCopy.Message.CompletedWaitBeforeHidingCopiedIndicator({
          snippetId,
        }),
      ),
    )
  })

  it.effect('the snippet disclosure child owns each disclosure state', () => {
    const disclosureId = 'root-story-snippet'

    return story(
      ApplicationTest,
      startAt(homeUrl),
      message(
        Block.deliver(
          SnippetDisclosure,
          'snippetDisclosure',
          SnippetDisclosure.Message.ToggledCodeDisclosure({
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
