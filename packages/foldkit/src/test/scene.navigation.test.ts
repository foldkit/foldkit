import { describe, expect, test } from 'vitest'

import * as Search from './apps/searchRouting.js'
import * as Scene from './scene.js'

describe('Scene.Navigation.changedUrl', () => {
  test('runs a realistic search flow only after the explicit URL event', () => {
    Scene.scene(
      {
        update: Search.update,
        view: Search.view,
        routing: { onUrlChange: Search.Message.ChangedUrl },
      },
      Scene.given(Search.initialModel),
      Scene.type(Scene.label('Search'), 'foldkit'),
      Scene.Command.resolve(
        Search.CancelSearch,
        Search.Message.CompletedCancelSearch(),
      ),
      Scene.Command.resolve(
        Search.ReplaceSearchUrl({ query: 'foldkit' }),
        Search.Message.CompletedReplaceSearchUrl(),
      ),
      Scene.expect(Scene.label('Requested URL')).toHaveText(''),
      Scene.Navigation.changedUrl('/?q=foldkit#results'),
      Scene.expectHandled(),
      Scene.expectOutMessage(
        Search.OutMessage.RequestedSearch({ pathname: '/' }),
      ),
      Scene.expect(Scene.label('Requested URL')).toHaveText(
        'http://localhost/?q=foldkit#results',
      ),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 2, query: 'foldkit' }),
        Search.Message.CompletedFetchSearch({
          searchId: 2,
          results: ['Foldkit result'],
        }),
      ),
      Scene.expectOutMessage(Search.OutMessage.PresentedResults({ count: 1 })),
      Scene.expect(Scene.role('status')).toHaveText('Foldkit result'),
    )
  })

  test('invalidates an older fetch before the URL arrives and ignores its result', () => {
    Scene.scene(
      {
        update: Search.update,
        view: Search.view,
        routing: { onUrlChange: url => Search.Message.ChangedUrl({ url }) },
      },
      Scene.given(Search.initialModel),
      Scene.Navigation.changedUrl('/?q=old'),
      Scene.Command.keepPending(
        Search.FetchSearch({ searchId: 1, query: 'old' }),
      ),
      Scene.type(Scene.label('Search'), 'new'),
      Scene.Command.resolve(
        Search.CancelSearch,
        Search.Message.CompletedCancelSearch(),
      ),
      Scene.Command.expectExact(
        Search.FetchSearch({ searchId: 1, query: 'old' }),
        Search.ReplaceSearchUrl({ query: 'new' }),
      ),
      Scene.Command.keepPending(Search.ReplaceSearchUrl({ query: 'new' })),
      Scene.expect(Scene.label('Requested URL')).toHaveText(
        'http://localhost/?q=old',
      ),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 1, query: 'old' }),
        Search.Message.CompletedFetchSearch({
          searchId: 1,
          results: ['Stale'],
        }),
      ),
      Scene.expect(Scene.role('status')).toHaveText('No results'),
      Scene.Navigation.changedUrl('/?q=new'),
      Scene.Command.resolve(
        Search.ReplaceSearchUrl({ query: 'new' }),
        Search.Message.CompletedReplaceSearchUrl(),
      ),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 3, query: 'new' }),
        Search.Message.CompletedFetchSearch({
          searchId: 3,
          results: ['Current'],
        }),
      ),
      Scene.expect(Scene.role('status')).toHaveText('Current'),
    )
  })

  test('resolves relative references against a fixed origin and keeps absolute origins', () => {
    Scene.scene(
      {
        update: Search.update,
        view: Search.view,
        routing: {
          onUrlChange: Search.Message.ChangedUrl,
          origin: 'https://search.test:444/',
        },
      },
      Scene.given(Search.initialModel),
      Scene.Navigation.changedUrl('items?q=one#first'),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 1, query: 'one' }),
        Search.Message.CompletedFetchSearch({ searchId: 1, results: ['One'] }),
      ),
      Scene.expect(Scene.label('Requested URL')).toHaveText(
        'https://search.test:444/items?q=one#first',
      ),
      Scene.Navigation.changedUrl('../?q=two#second'),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 2, query: 'two' }),
        Search.Message.CompletedFetchSearch({ searchId: 2, results: ['Two'] }),
      ),
      Scene.expect(Scene.label('Requested URL')).toHaveText(
        'https://search.test:444/?q=two#second',
      ),
      Scene.Navigation.changedUrl('https://elsewhere.test/a?q=three#third'),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 3, query: 'three' }),
        Search.Message.CompletedFetchSearch({
          searchId: 3,
          results: ['Three'],
        }),
      ),
      Scene.expect(Scene.label('Requested URL')).toHaveText(
        'https://elsewhere.test/a?q=three#third',
      ),
      Scene.Navigation.changedUrl('?q=four'),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 4, query: 'four' }),
        Search.Message.CompletedFetchSearch({ searchId: 4, results: ['Four'] }),
      ),
      Scene.expect(Scene.label('Requested URL')).toHaveText(
        'https://search.test:444/?q=four',
      ),
      Scene.Navigation.changedUrl('#results'),
      Scene.expect(Scene.label('Requested URL')).toHaveText(
        'https://search.test:444/#results',
      ),
    )
  })

  test('rejects invalid routing URLs and origins and requires erased routing configuration', () => {
    expect(() =>
      Scene.scene(
        {
          update: Search.update,
          view: Search.view,
          routing: { onUrlChange: Search.Message.ChangedUrl },
        },
        Scene.given(Search.initialModel),
        Scene.Navigation.changedUrl('http://['),
      ),
    ).toThrow('Scene.Navigation.changedUrl received an invalid URL')

    expect(() =>
      Scene.scene(
        {
          update: Search.update,
          view: Search.view,
          routing: {
            onUrlChange: Search.Message.ChangedUrl,
            origin: 'not an origin',
          },
        },
        Scene.given(Search.initialModel),
      ),
    ).toThrow('Scene routing.origin must be an absolute origin')

    expect(() =>
      Reflect.apply(Scene.scene, undefined, [
        { update: Search.update, view: Search.view },
        Scene.given(Search.initialModel),
        Scene.Navigation.changedUrl('/?q=missing'),
      ]),
    ).toThrow('Scene.Navigation.changedUrl requires routing.onUrlChange')
  })

  test('rejects an ordinary pending boundary before invoking the routing callback', () => {
    let callbackCalls = 0

    expect(() =>
      Scene.scene(
        {
          update: Search.update,
          view: Search.view,
          routing: {
            onUrlChange: url => {
              callbackCalls += 1
              return Search.Message.ChangedUrl({ url })
            },
          },
        },
        Scene.given(Search.initialModel),
        Scene.type(Scene.label('Search'), 'pending'),
        Scene.Navigation.changedUrl('/?q=pending'),
      ),
    ).toThrow(
      'I found unresolved Commands when Navigation.changedUrl delivered a new URL',
    )

    expect(callbackCalls).toBe(0)
  })

  test('keeps delivered Commands pending until explicit resolution and render acknowledges ended Mounts', () => {
    expect(() =>
      Scene.scene(
        {
          update: Search.update,
          view: Search.view,
          routing: { onUrlChange: Search.Message.ChangedUrl },
        },
        Scene.given(Search.initialModel),
        Scene.Navigation.changedUrl('/?q=kept'),
        Scene.Command.keepPending(
          Search.FetchSearch({ searchId: 1, query: 'kept' }),
        ),
      ),
    ).toThrow('I found Commands without resolvers')

    Scene.scene(
      {
        update: Search.update,
        view: Search.view,
        routing: { onUrlChange: Search.Message.ChangedUrl },
      },
      Scene.given(Search.initialModel),
      Scene.Navigation.changedUrl('/?q=mount'),
      Scene.Mount.resolve(
        Search.ObserveResults,
        Search.Message.CompletedObserveResults(),
      ),
      Scene.Command.resolve(
        Search.FetchSearch({ searchId: 1, query: 'mount' }),
        Search.Message.CompletedFetchSearch({
          searchId: 1,
          results: ['Mount'],
        }),
      ),
      Scene.Navigation.changedUrl('/'),
      Scene.Mount.expectEnded(Search.ObserveResults),
      Scene.expectOutMessage(
        Search.OutMessage.RequestedSearch({ pathname: '/' }),
      ),
    )
  })

  test.each([
    'https://search.test/path',
    'https://search.test/?q=one',
    'https://search.test/#results',
    'https://user:password@search.test',
    'file:///tmp/',
    null,
    42,
  ])('rejects a non-origin routing base: %s', origin => {
    expect(() =>
      Reflect.apply(Scene.scene, undefined, [
        {
          update: Search.update,
          view: Search.view,
          routing: {
            onUrlChange: Search.Message.ChangedUrl,
            origin,
          },
        },
        Scene.given(Search.initialModel),
      ]),
    ).toThrow('Scene routing.origin must be an absolute origin')
  })

  test.each([null, {}, { onUrlChange: 42 }])(
    'rejects malformed erased routing configuration: %j',
    routing => {
      expect(() =>
        Reflect.apply(Scene.scene, undefined, [
          { update: Search.update, view: Search.view, routing },
          Scene.given(Search.initialModel),
        ]),
      ).toThrow(
        'Scene routing.onUrlChange must be a callback or canonical Message constructor',
      )
    },
  )

  test('keeps pending and ended Mount boundaries for URL delivery', () => {
    const config = {
      update: Search.update,
      view: Search.view,
      routing: { onUrlChange: Search.Message.ChangedUrl },
    }
    const fetched = Search.Message.CompletedFetchSearch({
      searchId: 1,
      results: ['Mounted'],
    })

    expect(() =>
      Scene.scene(
        config,
        Scene.given(Search.initialModel),
        Scene.Navigation.changedUrl('/?q=mount'),
        Scene.Command.resolve(Search.FetchSearch, fetched),
        Scene.Navigation.changedUrl('/'),
      ),
    ).toThrow('unresolved Mounts')

    expect(() =>
      Scene.scene(
        config,
        Scene.given(Search.initialModel),
        Scene.Navigation.changedUrl('/?q=mount'),
        Scene.Mount.resolve(
          Search.ObserveResults,
          Search.Message.CompletedObserveResults(),
        ),
        Scene.Command.resolve(Search.FetchSearch, fetched),
        Scene.Navigation.changedUrl('/'),
        Scene.Navigation.changedUrl('#results'),
      ),
    ).toThrow('unacknowledged unmounts')
  })

  test('clears the previous OutMessage when a routing handler returns a silent result', () => {
    Scene.scene(
      {
        update: Search.update,
        view: Search.view,
        routing: {
          onUrlChange: url =>
            url.pathname === '/quiet'
              ? Search.Message.CompletedCancelSearch()
              : Search.Message.ChangedUrl({ url }),
        },
      },
      Scene.given(Search.initialModel),
      Scene.Navigation.changedUrl('/?q=one'),
      Scene.Command.resolve(
        Search.FetchSearch,
        Search.Message.CompletedFetchSearch({ searchId: 1, results: ['One'] }),
      ),
      Scene.expectOutMessage(Search.OutMessage.PresentedResults({ count: 1 })),
      Scene.Navigation.changedUrl('/quiet'),
      Scene.expectNoOutMessage(),
      Scene.expect(Scene.role('status')).toHaveText('One'),
    )
  })
})
