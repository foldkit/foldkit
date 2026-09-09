import { Array, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  AppRoute,
  LoadCatalog,
  LoadPainting,
  Message,
  Model,
  PaintingStatus,
  SaveDraft,
  init,
  update,
} from './main'

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const modelOn = (route: AppRoute): Model =>
  Model.make({
    route,
    transitionLog: [],
    catalogStatus: 'Idle',
    paintingStatus: PaintingStatus.Idle(),
    studioDraft: '',
    maybeSavedDraft: Option.none(),
  })

describe('init', () => {
  test('a cold load into the gallery logs the transition and loads the catalog', () => {
    const init_ = init(urlOrThrow('http://localhost/gallery'))

    expect(init_.model.route._tag).toBe('Gallery')
    expect(init_.model.catalogStatus).toBe('Loading')
    expect(init_.model.transitionLog).toHaveLength(1)
    expect(
      Array.map(init_.model.transitionLog, entry => entry.maybePreviousRoute),
    ).toStrictEqual([Option.none()])
    expect(Array.map(init_.commands ?? [], command => command.name)).toContain(
      'LoadCatalog',
    )
  })

  test('a cold load into the home route loads nothing', () => {
    const homeInit = init(urlOrThrow('http://localhost/'))

    expect(homeInit.model.route._tag).toBe('Home')
    expect(homeInit.model.catalogStatus).toBe('Idle')
    expect(homeInit.model.transitionLog).toHaveLength(1)
    expect(homeInit.commands ?? []).toStrictEqual([])
  })
})

describe('update', () => {
  test('entering the gallery loads the catalog and logs the transition', () => {
    story(
      update,
      given(modelOn(AppRoute.Home())),
      message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery') }),
      ),
      model(model => {
        expect(model.route._tag).toBe('Gallery')
        expect(model.catalogStatus).toBe('Loading')
        expect(model.transitionLog).toHaveLength(1)
      }),
      Command.expectHas(LoadCatalog),
      Command.resolve(LoadCatalog, Message.SucceededLoadCatalog()),
      model(model => {
        expect(model.catalogStatus).toBe('Ready')
      }),
    )
  })

  test('re-entering the gallery while a catalog load is in flight does not fire another', () => {
    story(
      update,
      given(evo(modelOn(AppRoute.Home()), { catalogStatus: () => 'Loading' })),
      message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery') }),
      ),
      Command.expectNone(),
      model(model => {
        expect(model.catalogStatus).toBe('Loading')
      }),
    )
  })

  test('entering a painting loads it with the payload from the route', () => {
    story(
      update,
      given(modelOn(AppRoute.Gallery())),
      message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery/3') }),
      ),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Loading({ paintingId: 3 }),
        )
      }),
      Command.expectHas(LoadPainting),
      Command.resolve(
        LoadPainting,
        Message.SucceededLoadPainting({ paintingId: 3 }),
      ),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Ready({ paintingId: 3 }),
        )
      }),
    )
  })

  test('staying on the painting route with a new id refetches', () => {
    story(
      update,
      given(
        evo(modelOn(AppRoute.Painting({ paintingId: 1 })), {
          paintingStatus: () => PaintingStatus.Ready({ paintingId: 1 }),
        }),
      ),
      message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery/2') }),
      ),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Loading({ paintingId: 2 }),
        )
        expect(
          Array.map(model.transitionLog, entry => entry.maybePreviousRoute),
        ).toStrictEqual([Option.some(AppRoute.Painting({ paintingId: 1 }))])
      }),
      Command.expectHas(LoadPainting),
      Command.resolve(
        LoadPainting,
        Message.SucceededLoadPainting({ paintingId: 2 }),
      ),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Ready({ paintingId: 2 }),
        )
      }),
    )
  })

  test('staying on the painting route with the same id does not refetch', () => {
    story(
      update,
      given(
        evo(modelOn(AppRoute.Painting({ paintingId: 1 })), {
          paintingStatus: () => PaintingStatus.Ready({ paintingId: 1 }),
        }),
      ),
      message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery/1') }),
      ),
      Command.expectNone(),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Ready({ paintingId: 1 }),
        )
      }),
    )
  })

  test('a stale painting response for another id is ignored', () => {
    story(
      update,
      given(
        evo(modelOn(AppRoute.Painting({ paintingId: 2 })), {
          paintingStatus: () => PaintingStatus.Loading({ paintingId: 2 }),
        }),
      ),
      message(Message.SucceededLoadPainting({ paintingId: 1 })),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Loading({ paintingId: 2 }),
        )
      }),
    )
  })

  test('leaving the studio saves the draft', () => {
    story(
      update,
      given(
        evo(modelOn(AppRoute.Studio()), {
          studioDraft: () => 'half-finished thought',
        }),
      ),
      message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
      Command.expectHas(SaveDraft),
      Command.resolve(
        SaveDraft,
        Message.SucceededSaveDraft({ draft: 'half-finished thought' }),
      ),
      model(model => {
        expect(model.maybeSavedDraft).toStrictEqual(
          Option.some('half-finished thought'),
        )
      }),
    )
  })

  test('leaving the studio with an empty draft saves nothing', () => {
    story(
      update,
      given(modelOn(AppRoute.Studio())),
      message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
      Command.expectNone(),
    )
  })
})
