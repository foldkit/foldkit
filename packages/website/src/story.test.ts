import { Effect, HashSet, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { LoadType, UrlChangeType } from 'foldkit/navigation'
import { Command, given, message, model, story } from 'foldkit/story'
import * as Url from 'foldkit/url'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Dialog, Menu } from '@foldkit/ui'

import { Deployment } from './deployment'
import {
  ApplyTheme,
  CopyLink,
  DisableBrowserScrollRestoration,
  LoadBrowserEnvironment,
  LoadPlayground,
  RestoreScrollPosition,
  ScrollSidebarActiveLinkIntoView,
  ScrollToAnchor,
  ScrollToTop,
  init,
  managedResources,
  subscriptions,
  update,
} from './main'
import { Message } from './message'
import { type Model } from './model'
import { Home } from './page'
import * as Search from './search'
import * as SnippetCopy from './snippetCopy'

const parseUrl = (value: string): Url.Url =>
  pipe(Url.fromString(value), Option.getOrThrow)

const homeUrl = parseUrl('https://foldkit.dev/')
const newsletterUrl = parseUrl('https://foldkit.dev/newsletter')
const newsletterSubscribeUrl = parseUrl(
  'https://foldkit.dev/newsletter#subscribe',
)

const flags = {
  currentYear: 2026,
  today: Calendar.make(2026, 8, 30),
  deployment: Deployment.Canary({ commit: 'test' }),
  maybeApiData: Option.none(),
  maybeExampleSources: Option.none(),
}

const initAt = (url: Url.Url): Model => init(flags, url, LoadType.Push()).model

const aiHeadingSubscription = subscriptions.aiHeading

const expectHomePresent = (model: Model): void => {
  expect(Option.isSome(model.maybeHome)).toBe(true)
  expect(
    Option.isSome(
      aiHeadingSubscription.modelToDependencies(model).maybeDependencies,
    ),
  ).toBe(true)
  expect(
    Option.isSome(
      managedResources.audioContext.modelToMaybeRequirements(model),
    ),
  ).toBe(true)
}

const expectHomeAbsent = (model: Model): void => {
  expect(Option.isNone(model.maybeHome)).toBe(true)
  expect(
    Option.isNone(
      aiHeadingSubscription.modelToDependencies(model).maybeDependencies,
    ),
  ).toBe(true)
  expect(
    Option.isNone(
      managedResources.audioContext.modelToMaybeRequirements(model),
    ),
  ).toBe(true)
}

const expectDefaultHome = (home: Home.Model): void => {
  expect(home.aiHeadingToggleCount).toBe(0)
  expect(home.activeDemoTab).toBe('Architecture')
  expect(home.asyncCounterDemo.count).toBe(0)
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
  test('entering Home initializes fresh state', () => {
    story(
      update,
      given(initAt(newsletterUrl)),
      model(expectHomeAbsent),
      message(
        Message.ChangedUrl({
          url: homeUrl,
          urlChangeType: UrlChangeType.Push(),
        }),
      ),
      model(model => {
        expectHomePresent(model)
        expectDefaultHome(Option.getOrThrow(model.maybeHome))
      }),
      ...resolvePathChangeCommands(),
    )
  })

  test('leaving Home removes the Home Submodel', () => {
    story(
      update,
      given(initAt(homeUrl)),
      model(expectHomePresent),
      message(
        Message.ChangedUrl({
          url: newsletterUrl,
          urlChangeType: UrlChangeType.Push(),
        }),
      ),
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
      message(
        Message.ChangedUrl({
          url: homeUrl,
          urlChangeType: UrlChangeType.Push(),
        }),
      ),
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
        Message.GotHomeMessage({
          message: Home.Message.ToggledAiHeading(),
        }),
      ),
      model(model => {
        expect(Option.getOrThrow(model.maybeHome).aiHeadingToggleCount).toBe(1)
      }),
      message(
        Message.ChangedUrl({
          url: newsletterUrl,
          urlChangeType: UrlChangeType.Push(),
        }),
      ),
      ...resolvePathChangeCommands(),
      message(
        Message.ChangedUrl({
          url: homeUrl,
          urlChangeType: UrlChangeType.Push(),
        }),
      ),
      model(model => {
        expectHomePresent(model)
        expectDefaultHome(Option.getOrThrow(model.maybeHome))
      }),
      ...resolvePathChangeCommands(),
    )
  })

  test('Back and Forward restore the position the reader left instead of scrolling to the top', () => {
    story(
      update,
      given(initAt(newsletterUrl)),
      message(
        Message.ChangedUrl({
          url: homeUrl,
          urlChangeType: UrlChangeType.Traverse({
            maybeSavedScrollPosition: Option.some({ x: 0, y: 1500 }),
          }),
        }),
      ),
      Command.expectExact(
        RestoreScrollPosition({ x: 0, y: 1500 }),
        ScrollSidebarActiveLinkIntoView(),
      ),
      Command.resolve(
        RestoreScrollPosition,
        Message.CompletedRestoreScrollPosition(),
      ),
      Command.resolve(
        ScrollSidebarActiveLinkIntoView,
        Message.CompletedScrollSidebarActiveLinkIntoView(),
      ),
    )
  })

  test('a reload restores the position the reader had on the page', () => {
    const reloadInit = init(
      flags,
      newsletterUrl,
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 2400 }),
      }),
    )

    expect(reloadInit.commands).toContainEqual(
      expect.objectContaining({
        name: RestoreScrollPosition.name,
        args: { x: 0, y: 2400 },
      }),
    )
    expect(reloadInit.commands).toContainEqual(
      expect.objectContaining({ name: DisableBrowserScrollRestoration.name }),
    )
  })

  test('Back and Forward to an entry with an anchor restore the recorded position instead of scrolling to the anchor', () => {
    story(
      update,
      given(initAt(homeUrl)),
      message(
        Message.ChangedUrl({
          url: newsletterSubscribeUrl,
          urlChangeType: UrlChangeType.Traverse({
            maybeSavedScrollPosition: Option.some({ x: 0, y: 900 }),
          }),
        }),
      ),
      Command.expectExact(
        RestoreScrollPosition({ x: 0, y: 900 }),
        ScrollSidebarActiveLinkIntoView(),
      ),
      Command.resolve(
        RestoreScrollPosition,
        Message.CompletedRestoreScrollPosition(),
      ),
      Command.resolve(
        ScrollSidebarActiveLinkIntoView,
        Message.CompletedScrollSidebarActiveLinkIntoView(),
      ),
    )
  })

  test('a reload of a page with an anchor restores the recorded position instead of scrolling to the anchor', () => {
    const reloadInit = init(
      flags,
      newsletterSubscribeUrl,
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 900 }),
      }),
    )

    expect(reloadInit.commands).toContainEqual(
      expect.objectContaining({
        name: RestoreScrollPosition.name,
        args: { x: 0, y: 900 },
      }),
    )
    expect(reloadInit.commands).not.toContainEqual(
      expect.objectContaining({ name: ScrollToAnchor.name }),
    )
  })

  test('Back or Forward to an entry without a recorded position scrolls to its anchor', () => {
    story(
      update,
      given(initAt(homeUrl)),
      message(
        Message.ChangedUrl({
          url: newsletterSubscribeUrl,
          urlChangeType: UrlChangeType.Traverse({
            maybeSavedScrollPosition: Option.none(),
          }),
        }),
      ),
      Command.expectExact(
        ScrollToAnchor({ hash: 'subscribe' }),
        ScrollSidebarActiveLinkIntoView(),
      ),
      Command.resolve(ScrollToAnchor, Message.CompletedScrollToAnchor()),
      Command.resolve(
        ScrollSidebarActiveLinkIntoView,
        Message.CompletedScrollSidebarActiveLinkIntoView(),
      ),
    )
  })

  test('Back or Forward to a new page without a recorded position scrolls to the top', () => {
    story(
      update,
      given(initAt(homeUrl)),
      message(
        Message.ChangedUrl({
          url: newsletterUrl,
          urlChangeType: UrlChangeType.Traverse({
            maybeSavedScrollPosition: Option.none(),
          }),
        }),
      ),
      Command.expectExact(ScrollToTop(), ScrollSidebarActiveLinkIntoView()),
      ...resolvePathChangeCommands(),
    )
  })

  test('a reload without a recorded position scrolls to the anchor', () => {
    const reloadInit = init(
      flags,
      newsletterSubscribeUrl,
      LoadType.Reload({ maybeSavedScrollPosition: Option.none() }),
    )

    expect(reloadInit.commands).toContainEqual(
      expect.objectContaining({
        name: ScrollToAnchor.name,
        args: { hash: 'subscribe' },
      }),
    )
    expect(reloadInit.commands).not.toContainEqual(
      expect.objectContaining({ name: RestoreScrollPosition.name }),
    )
  })

  test('init builds the same Model from the build URL and the reader URL', () => {
    const newsletterBuildInit = init(
      flags,
      parseUrl('http://localhost/newsletter'),
      LoadType.Push(),
    )
    const newsletterReaderInit = init(
      flags,
      parseUrl('https://foldkit.dev/newsletter/?ref=social#subscribe'),
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 2400 }),
      }),
    )

    expect(newsletterReaderInit.model).toStrictEqual(newsletterBuildInit.model)

    const navBuildInit = init(
      flags,
      parseUrl('http://localhost/ui/nav'),
      LoadType.Push(),
    )
    const navReaderInit = init(
      flags,
      parseUrl('https://foldkit.dev/ui/nav?section=library'),
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 900 }),
      }),
    )

    expect(navReaderInit.model).toStrictEqual(navBuildInit.model)
  })

  test('a link to another Nav demo section keeps the scroll position and shows that section', () => {
    story(
      update,
      given(initAt(parseUrl('https://foldkit.dev/ui/nav'))),
      message(
        Message.ChangedUrl({
          url: parseUrl('https://foldkit.dev/ui/nav?section=library'),
          urlChangeType: UrlChangeType.Push(),
        }),
      ),
      model(model => {
        expect(model.navDemoSection).toBe('Library')
      }),
      Command.expectNone(),
    )
  })

  test('the Nav demo shows the section in the address bar once the browser environment loads', () => {
    const profileUrl = parseUrl('https://foldkit.dev/ui/nav?section=profile')
    const profileInit = init(flags, profileUrl, LoadType.Push())

    expect(profileInit.commands).toContainEqual(
      expect.objectContaining({ name: LoadBrowserEnvironment.name }),
    )

    story(
      update,
      given(profileInit.model),
      model(model => {
        expect(model.navDemoSection).toBe('Home')
      }),
      message(
        Message.CompletedLoadBrowserEnvironment({
          maybeThemePreference: Option.none(),
          maybeSidebarState: Option.none(),
          systemTheme: 'Light',
          isPlaygroundSupported: false,
          currentYear: flags.currentYear,
          today: flags.today,
          maybeUrl: Option.some(profileUrl),
        }),
      ),
      model(model => {
        expect(model.navDemoSection).toBe('Profile')
      }),
      Command.resolve(ApplyTheme, Message.CompletedApplyTheme()),
    )
  })

  test('copying a heading link copies a link to that heading', () => {
    story(
      update,
      given(initAt(newsletterUrl)),
      message(Message.ClickedCopyLink({ hash: 'some-heading' })),
      Command.expectExact(CopyLink({ hash: 'some-heading' })),
      Command.resolve(CopyLink, Message.SucceededCopyLink()),
    )
  })

  test('late Home Messages are ignored while Home is absent', () => {
    story(
      update,
      given(initAt(newsletterUrl)),
      message(
        Message.GotHomeMessage({
          message: Home.Message.ToggledAiHeading(),
        }),
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
        Message.GotHomeMessage({
          message: Home.Message.GotPlaygroundMenuMessage({
            message: Menu.Message.SelectedItem({
              index: 0,
              item: 'counter',
            }),
          }),
        }),
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
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      Command.resolve(
        Search.FocusSearchInput,
        Search.Message.CompletedFocusSearchInput(),
      ),
    )
  })

  test('the parent delegates snippet copying to the child Submodel', () => {
    const snippetId = 'root-story-snippet'

    story(
      update,
      given(initAt(homeUrl)),
      message(
        Message.GotSnippetCopyMessage({
          message: SnippetCopy.Message.ClickedCopySnippet({
            snippetId,
            text: 'const count = 0',
          }),
        }),
      ),
      Command.resolve(
        SnippetCopy.CopySnippet,
        SnippetCopy.Message.SucceededCopySnippet({ snippetId }),
      ),
      model(model => {
        expect(HashSet.has(model.snippetCopy.copiedSnippetIds, snippetId)).toBe(
          true,
        )
      }),
      Command.resolve(
        SnippetCopy.WaitBeforeHidingCopiedIndicator,
        SnippetCopy.Message.CompletedWaitBeforeHidingCopiedIndicator({
          snippetId,
        }),
      ),
    )
  })
})

describe('commands', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  test('LoadBrowserEnvironment reads the URL in the address bar', async () => {
    window.history.replaceState(null, '', '/ui/nav?section=profile')

    const completed = await Effect.runPromise(LoadBrowserEnvironment().effect)

    expect(Option.map(completed.maybeUrl, Url.toString)).toStrictEqual(
      Option.some(`${window.location.origin}/ui/nav?section=profile`),
    )
  })

  test('CopyLink copies the URL in the address bar with the heading as its hash', async () => {
    window.history.replaceState(null, '', '/newsletter?ref=feed#intro')
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    const result = await Effect.runPromise(
      CopyLink({ hash: 'subscribe' }).effect,
    )

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/newsletter?ref=feed#subscribe`,
    )
    expect(result).toStrictEqual(Message.SucceededCopyLink())
  })
})
