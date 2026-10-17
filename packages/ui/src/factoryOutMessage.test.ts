import { Schema } from 'effect'
import type * as Update from 'foldkit/update'
import { expect, expectTypeOf, it } from 'vitest'

import * as MultiListbox from './listbox/multiPublic.js'
import * as Listbox from './listbox/public.js'
import * as Menu from './menu/public.js'
import * as RadioGroup from './radioGroup/public.js'
import * as Tabs from './tabs/public.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitListbox = Listbox.create<Fruit>()
const FruitMultiListbox = MultiListbox.create<Fruit>()
const FruitMenu = Menu.create<Fruit>()
const FruitRadioGroup = RadioGroup.create<Fruit>()
const FruitTabs = Tabs.create<Fruit>()

it('preserves refined OutMessage constructors and matchers on completed factories', () => {
  expectTypeOf<typeof FruitListbox.Model.Type>().toEqualTypeOf<Listbox.Model>()
  expectTypeOf<
    typeof FruitListbox.Message.Type
  >().toEqualTypeOf<Listbox.Message>()
  expectTypeOf<
    typeof FruitMultiListbox.Model.Type
  >().toEqualTypeOf<MultiListbox.Model>()
  expectTypeOf<
    typeof FruitMultiListbox.Message.Type
  >().toEqualTypeOf<Listbox.Message>()
  expectTypeOf<typeof FruitMenu.Model.Type>().toEqualTypeOf<Menu.Model>()
  expectTypeOf<typeof FruitMenu.Message.Type>().toEqualTypeOf<Menu.Message>()
  expectTypeOf<
    typeof FruitRadioGroup.Model.Type
  >().toEqualTypeOf<RadioGroup.Model>()
  expectTypeOf<
    typeof FruitRadioGroup.Message.Type
  >().toEqualTypeOf<RadioGroup.Message>()
  expectTypeOf<typeof FruitTabs.Model.Type>().toEqualTypeOf<Tabs.Model>()
  expectTypeOf<typeof FruitTabs.Message.Type>().toEqualTypeOf<Tabs.Message>()

  expectTypeOf(FruitListbox.expose.selectItem)
    .parameter(1)
    .toEqualTypeOf<Fruit>()
  expectTypeOf(FruitMultiListbox.expose.selectItem)
    .parameter(1)
    .toEqualTypeOf<Fruit>()
  expectTypeOf(FruitMenu.expose.selectItem).parameter(1).toEqualTypeOf<Fruit>()

  expectTypeOf<
    Update.RequirementsOf<typeof FruitListbox.update>
  >().toEqualTypeOf<Update.RequirementsOf<typeof Listbox.block.update>>()
  expectTypeOf<
    Update.RequirementsOf<typeof FruitMultiListbox.update>
  >().toEqualTypeOf<Update.RequirementsOf<typeof MultiListbox.block.update>>()
  expectTypeOf<Update.RequirementsOf<typeof FruitMenu.update>>().toEqualTypeOf<
    Update.RequirementsOf<typeof Menu.block.update>
  >()
  expectTypeOf<
    Update.RequirementsOf<typeof FruitRadioGroup.update>
  >().toEqualTypeOf<Update.RequirementsOf<typeof RadioGroup.block.update>>()
  expectTypeOf<Update.RequirementsOf<typeof FruitTabs.update>>().toEqualTypeOf<
    Update.RequirementsOf<typeof Tabs.block.update>
  >()

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
  const matchMenu = FruitMenu.OutMessage.match<Fruit>({
    Selected: ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<Fruit>()
      return value
    },
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
