import { Array, Option } from 'effect'
import { Command, given, init, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock } from './block'
import { LoadCatalog, LoadPainting, SaveDraft } from './command'
import { Message } from './message'
import { Model, PaintingStatus } from './model'
import { ApplicationRoute } from './route'

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const modelOn = (route: ApplicationRoute): Model =>
  Model.make({
    route,
    transitionLog: [],
    catalogStatus: 'Idle',
    paintingStatus: PaintingStatus.Idle(),
    studioDraft: '',
    maybeSavedDraft: Option.none(),
  })

describe('init', () => {
  it.effect(
    'a cold load into the gallery logs the transition and loads the catalog',
    () =>
      story(
        ApplicationBlock,
        init(urlOrThrow('http://localhost/gallery')),
        model(model => {
          expect(model.route._tag).toBe('Gallery')
          expect(model.catalogStatus).toBe('Loading')
          expect(model.transitionLog).toHaveLength(1)
          expect(
            Array.map(model.transitionLog, entry => entry.maybePreviousRoute),
          ).toStrictEqual([Option.none()])
        }),
        Command.expectHas(LoadCatalog),
        Command.resolve(LoadCatalog, Message.CompletedLoadCatalog()),
      ),
  )

  it.effect('a cold load into the home route loads nothing', () =>
    story(
      ApplicationBlock,
      init(urlOrThrow('http://localhost/')),
      model(model => {
        expect(model.route._tag).toBe('Home')
        expect(model.catalogStatus).toBe('Idle')
        expect(model.transitionLog).toHaveLength(1)
      }),
      Command.expectNone(),
    ),
  )
})

describe('update', () => {
  it.effect(
    'entering the gallery loads the catalog and logs the transition',
    () =>
      story(
        ApplicationBlock,
        given(modelOn(ApplicationRoute.Home())),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Gallery')
          expect(model.catalogStatus).toBe('Loading')
          expect(model.transitionLog).toHaveLength(1)
        }),
        Command.expectHas(LoadCatalog),
        Command.resolve(LoadCatalog, Message.CompletedLoadCatalog()),
        model(model => {
          expect(model.catalogStatus).toBe('Ready')
        }),
      ),
  )

  it.effect(
    're-entering the gallery while a catalog load is in flight does not fire another',
    () =>
      story(
        ApplicationBlock,
        given(
          modifyFields(modelOn(ApplicationRoute.Home()), {
            catalogStatus: () => 'Loading',
          }),
        ),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery') }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.catalogStatus).toBe('Loading')
        }),
      ),
  )

  it.effect(
    'entering a painting loads it with the payload from the route',
    () =>
      story(
        ApplicationBlock,
        given(modelOn(ApplicationRoute.Gallery())),
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
          Message.CompletedLoadPainting({ paintingId: 3 }),
        ),
        model(model => {
          expect(model.paintingStatus).toStrictEqual(
            PaintingStatus.Ready({ paintingId: 3 }),
          )
        }),
      ),
  )

  it.effect('staying on the painting route with a new id refetches', () =>
    story(
      ApplicationBlock,
      given(
        modifyFields(modelOn(ApplicationRoute.Painting({ paintingId: 1 })), {
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
        ).toStrictEqual([
          Option.some(ApplicationRoute.Painting({ paintingId: 1 })),
        ])
      }),
      Command.expectHas(LoadPainting),
      Command.resolve(
        LoadPainting,
        Message.CompletedLoadPainting({ paintingId: 2 }),
      ),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Ready({ paintingId: 2 }),
        )
      }),
    ),
  )

  it.effect(
    'staying on the painting route with the same id does not refetch',
    () =>
      story(
        ApplicationBlock,
        given(
          modifyFields(modelOn(ApplicationRoute.Painting({ paintingId: 1 })), {
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
      ),
  )

  it.effect('a stale painting response for another id is ignored', () =>
    story(
      ApplicationBlock,
      given(
        modifyFields(modelOn(ApplicationRoute.Painting({ paintingId: 2 })), {
          paintingStatus: () => PaintingStatus.Loading({ paintingId: 2 }),
        }),
      ),
      message(Message.CompletedLoadPainting({ paintingId: 1 })),
      model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Loading({ paintingId: 2 }),
        )
      }),
    ),
  )

  it.effect('leaving the studio saves the draft', () =>
    story(
      ApplicationBlock,
      given(
        modifyFields(modelOn(ApplicationRoute.Studio()), {
          studioDraft: () => 'half-finished thought',
        }),
      ),
      message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
      Command.expectHas(SaveDraft),
      Command.resolve(
        SaveDraft,
        Message.CompletedSaveDraft({ draft: 'half-finished thought' }),
      ),
      model(model => {
        expect(model.maybeSavedDraft).toStrictEqual(
          Option.some('half-finished thought'),
        )
      }),
    ),
  )

  it.effect('leaving the studio with an empty draft saves nothing', () =>
    story(
      ApplicationBlock,
      given(modelOn(ApplicationRoute.Studio())),
      message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
      Command.expectNone(),
    ),
  )
})
