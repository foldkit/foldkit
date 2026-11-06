import { Effect, Layer, Schema } from 'effect'
import * as Story from 'foldkit/story'
import type * as Update from 'foldkit/update'
import { expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import * as MultiListbox from './listbox/multi.js'
import * as Listbox from './listbox/single.js'
import * as Menu from './menu/menu.js'
import * as RadioGroup from './radioGroup/radioGroup.js'
import * as Tabs from './tabs/tabs.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitListbox = Listbox.makeBlock(Fruit)
const FruitMultiListbox = MultiListbox.makeBlock(Fruit)
const FruitMenu = Menu.makeBlock<Fruit>()
const FruitRadioGroup = RadioGroup.makeBlock<Fruit>()
const FruitTabs = Tabs.makeBlock<Fruit>()

it.effect(
  'preserves refined OutMessage constructors and matchers on acquired factories',
  () =>
    Story.withBlock(FruitListbox, fruitListbox =>
      Story.withBlock(FruitMultiListbox, fruitMultiListbox =>
        Story.withBlock(FruitMenu, fruitMenu =>
          Story.withBlock(FruitRadioGroup, fruitRadioGroup =>
            Story.withBlock(FruitTabs, fruitTabs => {
              expectTypeOf<
                typeof fruitListbox.Model.Type
              >().toEqualTypeOf<Listbox.Model>()
              expectTypeOf<
                typeof fruitMultiListbox.Model.Type
              >().toEqualTypeOf<MultiListbox.Model>()
              expectTypeOf<
                typeof fruitMenu.Model.Type
              >().toEqualTypeOf<Menu.Model>()
              expectTypeOf<typeof fruitMenu.OutMessage.Type>().toEqualTypeOf<
                Menu.OutMessage<Fruit>
              >()
              expectTypeOf<
                typeof fruitRadioGroup.Model.Type
              >().toEqualTypeOf<RadioGroup.Model>()
              expectTypeOf<
                typeof fruitTabs.Model.Type
              >().toEqualTypeOf<Tabs.Model>()

              expectTypeOf(fruitListbox.operations.requestSelectItem)
                .parameter(1)
                .toEqualTypeOf<Fruit>()
              expectTypeOf(fruitMultiListbox.operations.requestSelectItem)
                .parameter(1)
                .toEqualTypeOf<Fruit>()
              expectTypeOf(fruitMenu.operations.requestSelectItem)
                .parameter(1)
                .toEqualTypeOf<Fruit>()

              expectTypeOf<
                Update.RequirementsOf<typeof fruitListbox.update>
              >().toEqualTypeOf<
                Update.RequirementsOf<
                  Story.TestBlock<typeof Listbox.block>['update']
                >
              >()
              expectTypeOf<
                Update.RequirementsOf<typeof fruitMultiListbox.update>
              >().toEqualTypeOf<
                Update.RequirementsOf<
                  Story.TestBlock<typeof MultiListbox.block>['update']
                >
              >()
              expectTypeOf<
                Update.RequirementsOf<typeof fruitMenu.update>
              >().toEqualTypeOf<
                Update.RequirementsOf<
                  Story.TestBlock<typeof Menu.block>['update']
                >
              >()
              expectTypeOf<
                Update.RequirementsOf<typeof fruitRadioGroup.update>
              >().toEqualTypeOf<
                Update.RequirementsOf<
                  Story.TestBlock<typeof RadioGroup.block>['update']
                >
              >()
              expectTypeOf<
                Update.RequirementsOf<typeof fruitTabs.update>
              >().toEqualTypeOf<
                Update.RequirementsOf<
                  Story.TestBlock<typeof Tabs.block>['update']
                >
              >()

              const matchListbox = fruitListbox.OutMessage.match<Fruit>({
                Selected: ({ value }) => {
                  expectTypeOf(value).toEqualTypeOf<Fruit>()
                  return value
                },
              })
              const matchMultiListbox =
                fruitMultiListbox.OutMessage.match<Fruit>({
                  Selected: ({ value }) => {
                    expectTypeOf(value).toEqualTypeOf<Fruit>()
                    return value
                  },
                })
              const matchMenu = fruitMenu.OutMessage.match<Fruit | 'Closed'>({
                Selected: ({ value }) => {
                  expectTypeOf(value).toEqualTypeOf<Fruit>()
                  return value
                },
                Closed: () => 'Closed',
              })
              const matchRadioGroup = fruitRadioGroup.OutMessage.match<Fruit>({
                Selected: ({ value }) => {
                  expectTypeOf(value).toEqualTypeOf<Fruit>()
                  return value
                },
              })
              const matchTabs = fruitTabs.OutMessage.match<Fruit>({
                Selected: ({ value }) => {
                  expectTypeOf(value).toEqualTypeOf<Fruit>()
                  return value
                },
              })

              expect(
                matchListbox(
                  fruitListbox.OutMessage.Selected({ value: 'Apple' }),
                ),
              ).toBe('Apple')
              expect(
                matchMultiListbox(
                  fruitMultiListbox.OutMessage.Selected({ value: 'Apple' }),
                ),
              ).toBe('Apple')
              expect(
                matchMenu(
                  fruitMenu.OutMessage.Selected({ value: 'Apple', index: 0 }),
                ),
              ).toBe('Apple')
              expect(matchMenu(fruitMenu.OutMessage.Closed())).toBe('Closed')
              expect(
                matchRadioGroup(
                  fruitRadioGroup.OutMessage.Selected({
                    value: 'Apple',
                    index: 0,
                  }),
                ),
              ).toBe('Apple')
              expect(
                matchTabs(
                  fruitTabs.OutMessage.Selected({ value: 'Apple', index: 0 }),
                ),
              ).toBe('Apple')

              expectTypeOf(fruitListbox.OutMessage.Selected)
                .parameter(0)
                .not.toMatchTypeOf<{ value: 'Banana' }>()
              expectTypeOf(fruitMenu.OutMessage.Selected)
                .parameter(0)
                .not.toMatchTypeOf<{ value: 'Banana'; index: number }>()
              expectTypeOf(fruitMultiListbox.OutMessage.Selected)
                .parameter(0)
                .not.toMatchTypeOf<{ value: 'Banana' }>()
              expectTypeOf(fruitRadioGroup.OutMessage.Selected)
                .parameter(0)
                .not.toMatchTypeOf<{ value: 'Banana'; index: number }>()
              expectTypeOf(fruitTabs.OutMessage.Selected)
                .parameter(0)
                .not.toMatchTypeOf<{ value: 'Banana'; index: number }>()
            }),
          ),
        ),
      ),
    ).pipe(
      Effect.provide(
        Layer.mergeAll(
          Listbox.layer,
          MultiListbox.layer,
          Menu.layer,
          RadioGroup.layer,
          Tabs.layer,
        ),
      ),
    ),
)
