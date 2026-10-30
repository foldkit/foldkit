import { Layer, Option } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'
import * as Listbox from '@foldkit/ui/listbox'

import { ApplicationLive, Message } from './application'
import { Browse, BrowseLive, DietListbox, ReplaceFilters } from './browse'
import { Sorting, browseRouter } from './route'

const TestLive = ApplicationLive.pipe(Layer.provide(BrowseLive))

const browseMessage = (message: typeof Browse.Message.Type) =>
  Block.deliver(Browse, 'browse', message)

const dietMessage = (message: typeof DietListbox.Message.Type) =>
  Block.deliver(DietListbox, ['browse', 'dietListbox'], message)

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const browseArgs = { url: urlOrThrow('http://localhost/') }

describe('routing', () => {
  it('prints sorting in the same format the parser accepts', () => {
    const path = browseRouter({
      search: Option.none(),
      sorting: Sorting.Ascending({ column: 'Length' }),
      diet: Option.none(),
      period: Option.none(),
    })

    expect(decodeURIComponent(path)).toBe('/?sorting=Length:Ascending')
  })
})

describe('update', () => {
  describe('ChangedUrl', () => {
    it.effect('parses search, sorting, diet, and period from the URL', () =>
      story(
        TestLive,
        browseArgs,
        message(
          Message.ChangedUrl({
            url: urlOrThrow(
              'http://localhost/?search=raptor&sorting=Length:Ascending&diet=Carnivore&period=Cretaceous',
            ),
          }),
        ),
        model(model => {
          if (model.route._tag !== 'Browse') {
            throw new Error('Expected Browse route')
          }
          expect(model.route.search).toStrictEqual(Option.some('raptor'))
          expect(model.route.sorting).toStrictEqual(
            Sorting.Ascending({ column: 'Length' }),
          )
          expect(model.route.diet).toStrictEqual(Option.some('Carnivore'))
          expect(model.route.period).toStrictEqual(Option.some('Cretaceous'))
        }),
      ),
    )

    it.effect('an unknown path falls through to NotFound', () =>
      story(
        TestLive,
        browseArgs,
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/somewhere/else'),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('NotFound')
        }),
      ),
    )
  })

  describe('ChangedSearchInput', () => {
    it.effect(
      'typing search text fires a URL replacement with the new value',
      () =>
        story(
          TestLive,
          browseArgs,
          message(
            browseMessage(Browse.Message.ChangedSearchInput({ value: 'rex' })),
          ),
          Command.expectHas(ReplaceFilters),
          Command.resolve(
            ReplaceFilters,
            Browse.Message.CompletedReplaceFilters(),
          ),
        ),
    )

    it.effect('clearing the search input fires a replacement', () =>
      story(
        TestLive,
        { url: urlOrThrow('http://localhost/?search=foo') },
        message(
          browseMessage(Browse.Message.ChangedSearchInput({ value: '' })),
        ),
        Command.expectHas(ReplaceFilters),
        Command.resolve(
          ReplaceFilters,
          Browse.Message.CompletedReplaceFilters(),
        ),
      ),
    )
  })

  describe('ClickedColumnHeader', () => {
    it.effect(
      'first click on an Unsorted column produces an Ascending sort',
      () =>
        story(
          TestLive,
          browseArgs,
          message(
            browseMessage(
              Browse.Message.ClickedColumnHeader({ column: 'Name' }),
            ),
          ),
          Command.expectHas(ReplaceFilters),
          Command.resolve(
            ReplaceFilters,
            Browse.Message.CompletedReplaceFilters(),
          ),
        ),
    )
  })

  describe('Listbox SelectedItem', () => {
    it.effect(
      'selecting a diet refocuses the listbox button and replaces the URL',
      () =>
        story(
          TestLive,
          browseArgs,
          message(
            dietMessage(
              DietListbox.Message.Opened({
                maybeActiveItemIndex: Option.none(),
              }),
            ),
          ),
          Command.resolve(
            Listbox.test.FocusListboxItems,
            DietListbox.Message.CompletedFocusListboxItems(),
          ),
          message(
            dietMessage(
              DietListbox.Message.SelectedItem({ item: 'Carnivore' }),
            ),
          ),
          Command.resolve(
            Listbox.test.FocusListboxButton,
            DietListbox.Message.CompletedFocusListboxButton(),
          ),
          Command.expectHas(ReplaceFilters),
          Command.resolve(
            ReplaceFilters,
            Browse.Message.CompletedReplaceFilters(),
          ),
        ),
    )
  })
})
