import { Array, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  ApplicationRoute,
  LoadCatalog,
  LoadPainting,
  Message,
  Model,
  PaintingStatus,
  SaveDraft,
  init,
} from './application'

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const startingArgs = { url: urlOrThrow('http://localhost/') }

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
  it('a cold load into the gallery logs the transition and loads the catalog', () => {
    const init_ = init(urlOrThrow('http://localhost/gallery'))

    expect(init_.model.route._tag).toBe('Gallery')
    expect(init_.model.catalogStatus).toBe('Loading')
    expect(init_.model.transitionLog).toHaveLength(1)
    expect(
      Array.map(init_.model.transitionLog, entry => entry.maybePreviousRoute),
    ).toStrictEqual([Option.none()])
    expect(
      Array.some(
        init_.commands ?? [],
        command => command.name === LoadCatalog.name,
      ),
    ).toBe(true)
  })

  it('a cold load into the home route loads nothing', () => {
    const homeInit = init(urlOrThrow('http://localhost/'))

    expect(homeInit.model.route._tag).toBe('Home')
    expect(homeInit.model.catalogStatus).toBe('Idle')
    expect(homeInit.model.transitionLog).toHaveLength(1)
    expect(homeInit.commands ?? []).toStrictEqual([])
  })
})

describe('update', () => {
  it.effect(
    'entering the gallery loads the catalog and logs the transition',
    () =>
      story(
        ApplicationLive,
        startingArgs,
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
        ApplicationLive,
        startingArgs,
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
        ApplicationLive,
        startingArgs,
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
      ApplicationLive,
      startingArgs,
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
        ApplicationLive,
        startingArgs,
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
      ApplicationLive,
      startingArgs,
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
      ApplicationLive,
      startingArgs,
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
      ApplicationLive,
      startingArgs,
      given(modelOn(ApplicationRoute.Studio())),
      message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
      Command.expectNone(),
    ),
  )
})
