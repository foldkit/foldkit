import { HashSet, Option, Record, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import * as Url from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { Dialog, Menu } from '@foldkit/ui'

import { Deployment } from './deployment'
import {
  LoadPlayground,
  ScrollSidebarActiveLinkIntoView,
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

const flags = {
  currentYear: 2026,
  today: Calendar.make(2026, 8, 30),
  deployment: Deployment.Canary({ commit: 'test' }),
  maybeApiData: Option.none(),
  maybeExampleSources: Option.none(),
}

const initAt = (url: Url.Url): Model => init(flags, url).model

const aiHeadingSubscription = pipe(
  subscriptions,
  Record.get('aiHeading'),
  Option.getOrThrow,
)

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
      message(Message.ChangedUrl({ url: homeUrl })),
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
        Message.GotHomeMessage({
          message: Home.Message.ToggledAiHeading(),
        }),
      ),
      model(model => {
        expect(Option.getOrThrow(model.maybeHome).aiHeadingToggleCount).toBe(1)
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
