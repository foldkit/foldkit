import { Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as MultiListbox from './listbox/multi.js'
import * as Listbox from './listbox/single.js'
import * as Menu from './menu/menu.js'
import * as RadioGroup from './radioGroup/radioGroup.js'
import * as Tabs from './tabs/tabs.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitListbox = Listbox.makeBlock<Fruit>()
const FruitMultiListbox = MultiListbox.makeBlock<Fruit>()
const FruitMenu = Menu.makeBlock<Fruit>()
const FruitRadioGroup = RadioGroup.makeBlock<Fruit>()
const FruitTabs = Tabs.makeBlock<Fruit>()

it('preserves refined Message and OutMessage constructors and matchers on factory classes', () => {
  expectTypeOf<typeof FruitListbox.Model.Type>().toEqualTypeOf<Listbox.Model>()
  expectTypeOf<
    typeof FruitMultiListbox.Model.Type
  >().toEqualTypeOf<MultiListbox.Model>()
  expectTypeOf<typeof FruitMenu.Model.Type>().toEqualTypeOf<Menu.Model>()
  expectTypeOf<typeof FruitMenu.OutMessage.Type>().toEqualTypeOf<
    Menu.OutMessage<Fruit>
  >()
  expectTypeOf<
    typeof FruitRadioGroup.Model.Type
  >().toEqualTypeOf<RadioGroup.Model>()
  expectTypeOf<typeof FruitTabs.Model.Type>().toEqualTypeOf<Tabs.Model>()

  expectTypeOf<
    Parameters<typeof FruitListbox.Message.RequestedSelectItem>[0]['item']
  >().toEqualTypeOf<Fruit>()
  expectTypeOf<
    Parameters<typeof FruitMultiListbox.Message.RequestedSelectItem>[0]['item']
  >().toEqualTypeOf<Fruit>()
  expectTypeOf<
    Parameters<typeof FruitMenu.Message.RequestedSelectItem>[0]['item']
  >().toEqualTypeOf<Fruit>()

  const matchListbox = FruitListbox.OutMessage.match<Fruit>({
    Selected: ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<Fruit>()
      return value
    },
  })
  const matchMultiListbox = FruitMultiListbox.OutMessage.match<Fruit>({
    Selected: ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<Fruit>()
      return value
    },
  })
  const matchMenu = FruitMenu.OutMessage.match<Fruit | 'Closed'>({
    Selected: ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<Fruit>()
      return value
    },
    Closed: () => 'Closed',
  })
  const matchRadioGroup = FruitRadioGroup.OutMessage.match<Fruit>({
    Selected: ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<Fruit>()
      return value
    },
  })
  const matchTabs = FruitTabs.OutMessage.match<Fruit>({
    Selected: ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<Fruit>()
      return value
    },
  })

  expect(
    matchListbox(FruitListbox.OutMessage.Selected({ value: 'Apple' })),
  ).toBe('Apple')
  expect(
    matchMultiListbox(
      FruitMultiListbox.OutMessage.Selected({ value: 'Apple' }),
    ),
  ).toBe('Apple')
  expect(
    matchMenu(FruitMenu.OutMessage.Selected({ value: 'Apple', index: 0 })),
  ).toBe('Apple')
  expect(matchMenu(FruitMenu.OutMessage.Closed())).toBe('Closed')
  expect(
    matchRadioGroup(
      FruitRadioGroup.OutMessage.Selected({ value: 'Apple', index: 0 }),
    ),
  ).toBe('Apple')
  expect(
    matchTabs(FruitTabs.OutMessage.Selected({ value: 'Apple', index: 0 })),
  ).toBe('Apple')

  expectTypeOf(FruitListbox.OutMessage.Selected)
    .parameter(0)
    .not.toMatchTypeOf<{ value: 'Banana' }>()
  expectTypeOf(FruitMenu.OutMessage.Selected)
    .parameter(0)
    .not.toMatchTypeOf<{ value: 'Banana'; index: number }>()
  expectTypeOf(FruitMultiListbox.OutMessage.Selected)
    .parameter(0)
    .not.toMatchTypeOf<{ value: 'Banana' }>()
  expectTypeOf(FruitRadioGroup.OutMessage.Selected)
    .parameter(0)
    .not.toMatchTypeOf<{ value: 'Banana'; index: number }>()
  expectTypeOf(FruitTabs.OutMessage.Selected)
    .parameter(0)
    .not.toMatchTypeOf<{ value: 'Banana'; index: number }>()
})
