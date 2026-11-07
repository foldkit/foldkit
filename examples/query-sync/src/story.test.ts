import { Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Listbox } from '@foldkit/ui'

import { ReplaceFilters } from './command'
import { DietListboxBinding } from './composition'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { DietListboxBlock, type Model, PeriodListboxBlock } from './model'
import { ApplicationRoute, Sorting, browseRouter } from './route'

const browseModel: Model = {
  route: ApplicationRoute.Browse({
    search: Option.none(),
    sorting: Sorting.Unsorted(),
    diet: Option.none(),
    period: Option.none(),
  }),
  dietListbox: DietListboxBlock.Model.make({
    id: 'diet-filter',
    isOpen: false,
    isAnimated: false,
    isModal: false,
    orientation: 'Vertical',
    animation: {
      id: 'diet-filter' + '-listbox',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeActiveItemIndex: Option.none(),
    activationTrigger: 'Keyboard',
    searchQuery: '',
    searchVersion: 0,
    maybeLastPointerPosition: Option.none(),
    maybeLastButtonPointerType: Option.none(),
  }),
  periodListbox: PeriodListboxBlock.Model.make({
    id: 'period-filter',
    isOpen: false,
    isAnimated: false,
    isModal: false,
    orientation: 'Vertical',
    animation: {
      id: 'period-filter' + '-listbox',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeActiveItemIndex: Option.none(),
    activationTrigger: 'Keyboard',
    searchQuery: '',
    searchVersion: 0,
    maybeLastPointerPosition: Option.none(),
    maybeLastButtonPointerType: Option.none(),
  }),
}

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(browseModel),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow(
              'http://localhost/?search=raptor&sorting=Length:Ascending&diet=Carnivore&period=Cretaceous',
            ),
          }),
        ),
        Story.model(model => {
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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(browseModel),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/somewhere/else'),
          }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('NotFound')
        }),
      ),
    )
  })

  describe('ChangedSearchInput', () => {
    it.effect(
      'typing search text fires a URL replacement with the new value',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(browseModel),
          Story.message(Message.ChangedSearchInput({ value: 'rex' })),
          Story.Command.expectHas(ReplaceFilters),
          Story.Command.resolve(
            ReplaceFilters,
            Message.CompletedReplaceFilters(),
          ),
        ),
    )

    it.effect('clearing the search input fires a replacement', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(browseModel, {
            route: () =>
              ApplicationRoute.Browse({
                search: Option.some('foo'),
                sorting: Sorting.Unsorted(),
                diet: Option.none(),
                period: Option.none(),
              }),
          }),
        ),
        Story.message(Message.ChangedSearchInput({ value: '' })),
        Story.Command.expectHas(ReplaceFilters),
        Story.Command.resolve(
          ReplaceFilters,
          Message.CompletedReplaceFilters(),
        ),
      ),
    )
  })

  describe('ClickedColumnHeader', () => {
    it.effect(
      'first click on an Unsorted column produces an Ascending sort',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(browseModel),
          Story.message(Message.ClickedColumnHeader({ column: 'Name' })),
          Story.Command.expectHas(ReplaceFilters),
          Story.Command.resolve(
            ReplaceFilters,
            Message.CompletedReplaceFilters(),
          ),
        ),
    )
  })

  describe('Listbox SelectedItem', () => {
    it.effect(
      'selecting a diet refocuses the listbox button and replaces the URL',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(browseModel),
          Story.messageIn(
            DietListboxBinding,
            DietListboxBlock.Message.Opened({
              maybeActiveItemIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            Listbox.test.FocusListboxItems,
            DietListboxBlock.Message.CompletedFocusListboxItems(),
          ),
          Story.messageIn(
            DietListboxBinding,
            DietListboxBlock.Message.SelectedItem({ item: 'Carnivore' }),
          ),
          Story.Command.resolve(
            Listbox.test.FocusListboxButton,
            DietListboxBlock.Message.CompletedFocusListboxButton(),
          ),
          Story.Command.expectHas(ReplaceFilters),
          Story.Command.resolve(
            ReplaceFilters,
            Message.CompletedReplaceFilters(),
          ),
        ),
    )
  })
})
