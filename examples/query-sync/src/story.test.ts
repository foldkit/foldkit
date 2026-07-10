import { Option } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { Listbox } from '@foldkit/ui'

import {
  Ascending,
  BrowseRoute,
  ChangedSearchInput,
  ChangedUrl,
  ClickedColumnHeader,
  CompletedReplaceFilters,
  GotDietListboxMessage,
  type Model,
  ReplaceFilters,
  Unsorted,
  update,
} from './main'

const browseModel: Model = {
  route: BrowseRoute({
    search: Option.none(),
    sorting: Unsorted(),
    diet: Option.none(),
    period: Option.none(),
  }),
  dietListbox: Listbox.init({ id: 'diet-filter' }),
  periodListbox: Listbox.init({ id: 'period-filter' }),
}

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('parses search, sorting, diet, and period from the URL', () => {
      Story.story(
        update,
        Story.with(browseModel),
        Story.message(
          ChangedUrl({
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
            Ascending({ column: 'Length' }),
          )
          expect(model.route.diet).toStrictEqual(Option.some('Carnivore'))
          expect(model.route.period).toStrictEqual(Option.some('Cretaceous'))
        }),
      )
    })

    test('an unknown path falls through to NotFound', () => {
      Story.story(
        update,
        Story.with(browseModel),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/somewhere/else') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('NotFound')
        }),
      )
    })
  })

  describe('ChangedSearchInput', () => {
    test('typing search text fires a URL replacement with the new value', () => {
      Story.story(
        update,
        Story.with(browseModel),
        Story.message(ChangedSearchInput({ value: 'rex' })),
        Story.Command.expectHas(ReplaceFilters),
        Story.Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })

    test('clearing the search input fires a replacement', () => {
      Story.story(
        update,
        Story.with({
          ...browseModel,
          route: BrowseRoute({
            search: Option.some('foo'),
            sorting: Unsorted(),
            diet: Option.none(),
            period: Option.none(),
          }),
        }),
        Story.message(ChangedSearchInput({ value: '' })),
        Story.Command.expectHas(ReplaceFilters),
        Story.Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })
  })

  describe('ClickedColumnHeader', () => {
    test('first click on an Unsorted column produces an Ascending sort', () => {
      Story.story(
        update,
        Story.with(browseModel),
        Story.message(ClickedColumnHeader({ column: 'Name' })),
        Story.Command.expectHas(ReplaceFilters),
        Story.Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })
  })

  describe('Listbox SelectedItem', () => {
    test('selecting a diet refocuses the listbox button and replaces the URL', () => {
      Story.story(
        update,
        Story.with(browseModel),
        Story.message(
          GotDietListboxMessage({
            message: Listbox.SelectedItem({ item: 'Carnivore' }),
          }),
        ),
        Story.Command.resolve(
          Listbox.FocusButton,
          Listbox.CompletedFocusButton(),
        ),
        Story.Command.expectHas(ReplaceFilters),
        Story.Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })
  })
})
