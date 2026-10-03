import { Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { create as createComboboxMulti } from '../combobox/multi.js'
import { type OutMessage as ComboboxOutMessage } from '../combobox/shared.js'
import { create as createCombobox } from '../combobox/single.js'
import { create as createListboxMulti } from '../listbox/multi.js'
import { type OutMessage as ListboxOutMessage } from '../listbox/shared.js'
import { create as createListbox } from '../listbox/single.js'
import {
  type OutMessage as MenuOutMessage,
  create as createMenu,
} from '../menu/index.js'
import {
  Message,
  OutMessage,
  type OutMessage as RadioGroupOutMessage,
  create as createRadioGroup,
  init,
} from '../radioGroup/index.js'
import {
  type OutMessage as TabsOutMessage,
  create as createTabs,
} from '../tabs/index.js'

const Theme = Schema.Literals(['Light', 'Dark'])
type Theme = typeof Theme.Type

const City = Schema.Literals(['Kyiv', 'Oxford'])
type City = typeof City.Type

type Person = Readonly<{
  name: string
}>

describe('bundle OutMessage.match', () => {
  it('reads Value from a RadioGroup bundle', () => {
    const ThemeRadioGroup = createRadioGroup<Theme>()
    const themeUpdate = ThemeRadioGroup.update(
      init({ id: 'theme' }),
      Message.SelectedOption({ index: 0, value: 'Light' }),
    )
    const outMessage = themeUpdate.outMessage

    expect(ThemeRadioGroup.OutMessage.match).toBe(OutMessage.match)

    if (outMessage === undefined) {
      throw new Error('SelectedOption produced no OutMessage')
    }

    const theme = ThemeRadioGroup.OutMessage.match<Theme>(outMessage, {
      Selected: ({ value }) => value,
    })
    const foldTheme = ThemeRadioGroup.OutMessage.match<Theme>({
      Selected: ({ value }) => value,
    })

    expect(theme).toBe('Light')
    expectTypeOf(theme).toEqualTypeOf<Theme>()
    expectTypeOf(foldTheme).toEqualTypeOf<
      (outMessage: RadioGroupOutMessage<Theme>) => Theme
    >()
  })

  it('types every Value-typed bundle matcher', () => {
    const ThemeTabs = createTabs<Theme>()
    const foldTabs = ThemeTabs.OutMessage.match<Theme>({
      Selected: ({ value }) => value,
    })

    const ActionMenu = createMenu<'Edit' | 'Delete'>()
    const foldMenu = ActionMenu.OutMessage.match<'Edit' | 'Delete'>({
      Selected: ({ value }) => value,
    })

    const CityCombobox = createCombobox<City>()
    const foldCombobox = CityCombobox.OutMessage.match<City | undefined>({
      Selected: ({ value }) => value,
      ClearedSelection: () => undefined,
    })

    const CitiesCombobox = createComboboxMulti<City>()
    const foldComboboxMulti = CitiesCombobox.OutMessage.match<City | undefined>(
      {
        Selected: ({ value }) => value,
        ClearedSelection: () => undefined,
      },
    )

    const PersonListbox = createListbox<Person, 'a' | 'b'>()
    const foldListbox = PersonListbox.OutMessage.match<'a' | 'b'>({
      Selected: ({ value }) => value,
    })

    const PeopleListbox = createListboxMulti<Person, City>()
    const foldListboxMulti = PeopleListbox.OutMessage.match<City>({
      Selected: ({ value }) => value,
    })

    expectTypeOf(foldTabs).toEqualTypeOf<
      (outMessage: TabsOutMessage<Theme>) => Theme
    >()
    expectTypeOf(foldMenu).toEqualTypeOf<
      (outMessage: MenuOutMessage<'Edit' | 'Delete'>) => 'Edit' | 'Delete'
    >()
    expectTypeOf(foldCombobox).toEqualTypeOf<
      (outMessage: ComboboxOutMessage<City>) => City | undefined
    >()
    expectTypeOf(foldComboboxMulti).toEqualTypeOf<
      (outMessage: ComboboxOutMessage<City>) => City | undefined
    >()
    expectTypeOf(foldListbox).toEqualTypeOf<
      (outMessage: ListboxOutMessage<'a' | 'b'>) => 'a' | 'b'
    >()
    expectTypeOf(foldListboxMulti).toEqualTypeOf<
      (outMessage: ListboxOutMessage<City>) => City
    >()
  })
})
