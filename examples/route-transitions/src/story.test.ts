import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { LoadCatalog, LoadPainting, SaveDraft } from './command'
import { ApplicationBlock, layer } from './index'
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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(urlOrThrow('http://localhost/gallery')),
        Story.model(model => {
          expect(model.route._tag).toBe('Gallery')
          expect(model.catalogStatus).toBe('Loading')
          expect(model.transitionLog).toHaveLength(1)
          expect(
            Array.map(model.transitionLog, entry => entry.maybePreviousRoute),
          ).toStrictEqual([Option.none()])
        }),
        Story.Command.expectHas(LoadCatalog),
        Story.Command.resolve(LoadCatalog, Message.CompletedLoadCatalog()),
      ),
  )

  it.effect('a cold load into the home route loads nothing', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.init(urlOrThrow('http://localhost/')),
      Story.model(model => {
        expect(model.route._tag).toBe('Home')
        expect(model.catalogStatus).toBe('Idle')
        expect(model.transitionLog).toHaveLength(1)
      }),
      Story.Command.expectNone(),
    ),
  )
})

describe('update', () => {
  it.effect(
    'entering the gallery loads the catalog and logs the transition',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelOn(ApplicationRoute.Home())),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Gallery')
          expect(model.catalogStatus).toBe('Loading')
          expect(model.transitionLog).toHaveLength(1)
        }),
        Story.Command.expectHas(LoadCatalog),
        Story.Command.resolve(LoadCatalog, Message.CompletedLoadCatalog()),
        Story.model(model => {
          expect(model.catalogStatus).toBe('Ready')
        }),
      ),
  )

  it.effect(
    're-entering the gallery while a catalog load is in flight does not fire another',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(modelOn(ApplicationRoute.Home()), {
            catalogStatus: () => 'Loading',
          }),
        ),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery') }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.catalogStatus).toBe('Loading')
        }),
      ),
  )

  it.effect(
    'entering a painting loads it with the payload from the route',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelOn(ApplicationRoute.Gallery())),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery/3') }),
        ),
        Story.model(model => {
          expect(model.paintingStatus).toStrictEqual(
            PaintingStatus.Loading({ paintingId: 3 }),
          )
        }),
        Story.Command.expectHas(LoadPainting),
        Story.Command.resolve(
          LoadPainting,
          Message.CompletedLoadPainting({ paintingId: 3 }),
        ),
        Story.model(model => {
          expect(model.paintingStatus).toStrictEqual(
            PaintingStatus.Ready({ paintingId: 3 }),
          )
        }),
      ),
  )

  it.effect('staying on the painting route with a new id refetches', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(modelOn(ApplicationRoute.Painting({ paintingId: 1 })), {
          paintingStatus: () => PaintingStatus.Ready({ paintingId: 1 }),
        }),
      ),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery/2') }),
      ),
      Story.model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Loading({ paintingId: 2 }),
        )
        expect(
          Array.map(model.transitionLog, entry => entry.maybePreviousRoute),
        ).toStrictEqual([
          Option.some(ApplicationRoute.Painting({ paintingId: 1 })),
        ])
      }),
      Story.Command.expectHas(LoadPainting),
      Story.Command.resolve(
        LoadPainting,
        Message.CompletedLoadPainting({ paintingId: 2 }),
      ),
      Story.model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Ready({ paintingId: 2 }),
        )
      }),
    ),
  )

  it.effect(
    'staying on the painting route with the same id does not refetch',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(modelOn(ApplicationRoute.Painting({ paintingId: 1 })), {
            paintingStatus: () => PaintingStatus.Ready({ paintingId: 1 }),
          }),
        ),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/gallery/1') }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.paintingStatus).toStrictEqual(
            PaintingStatus.Ready({ paintingId: 1 }),
          )
        }),
      ),
  )

  it.effect('a stale painting response for another id is ignored', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(modelOn(ApplicationRoute.Painting({ paintingId: 2 })), {
          paintingStatus: () => PaintingStatus.Loading({ paintingId: 2 }),
        }),
      ),
      Story.message(Message.CompletedLoadPainting({ paintingId: 1 })),
      Story.model(model => {
        expect(model.paintingStatus).toStrictEqual(
          PaintingStatus.Loading({ paintingId: 2 }),
        )
      }),
    ),
  )

  it.effect('leaving the studio saves the draft', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(modelOn(ApplicationRoute.Studio()), {
          studioDraft: () => 'half-finished thought',
        }),
      ),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
      ),
      Story.Command.expectHas(SaveDraft),
      Story.Command.resolve(
        SaveDraft,
        Message.CompletedSaveDraft({ draft: 'half-finished thought' }),
      ),
      Story.model(model => {
        expect(model.maybeSavedDraft).toStrictEqual(
          Option.some('half-finished thought'),
        )
      }),
    ),
  )

  it.effect('leaving the studio with an empty draft saves nothing', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(modelOn(ApplicationRoute.Studio())),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
      ),
      Story.Command.expectNone(),
    ),
  )
})
