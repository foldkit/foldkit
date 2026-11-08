import { Effect } from 'effect'

import {
  type Construction,
  type ConstructionError,
  EncodedListbox,
  EncodedMenu,
  EncodedMultiListbox,
  EncodedRadioGroup,
  EncodedTabs,
  type Fruit,
  FruitListbox,
  FruitListboxBinding,
  FruitMenu,
  FruitMenuBinding,
  FruitMultiListbox,
  FruitRadioGroup,
  FruitTabs,
  type MemberId,
  MemberListbox,
  ordinaryPicker,
  pairedFruitListbox,
  pairedQuotes,
  pairedServicefulOptionListbox,
  pairedTabs,
  pairedWindows,
  providedQuotes,
  selectedPicker,
  selectedQuotes,
} from './unified-factories.accepted.js'
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
export type Checks = readonly [
  Assert<
    Equal<
      Parameters<typeof FruitMenuBinding.requestSelectItem>,
      [item: Fruit, index: number]
    >
  >,
  Assert<Equal<(typeof FruitMenu.Message.SelectedItem.Type)['item'], Fruit>>,
  Assert<
    Equal<(typeof FruitRadioGroup.Message.SelectedOption.Type)['value'], Fruit>
  >,
  Assert<Equal<(typeof FruitTabs.Message.SelectedTab.Type)['value'], Fruit>>,
  Assert<
    Equal<(typeof EncodedMenu.Message.SelectedItem.Encoded)['item'], number>
  >,
  Assert<
    Equal<
      (typeof EncodedRadioGroup.Message.SelectedOption.Encoded)['value'],
      number
    >
  >,
  Assert<
    Equal<(typeof EncodedTabs.Message.SelectedTab.Encoded)['value'], number>
  >,
  Assert<
    Equal<(typeof EncodedMenu.OutMessage.Selected.Encoded)['value'], number>
  >,
  Assert<
    Equal<
      (typeof EncodedRadioGroup.OutMessage.Selected.Encoded)['value'],
      number
    >
  >,
  Assert<
    Equal<(typeof EncodedTabs.OutMessage.Selected.Encoded)['value'], number>
  >,
  Assert<Equal<Effect.Services<typeof ordinaryPicker>, never>>,
  Assert<Equal<Effect.Services<typeof pairedFruitListbox>, never>>,
  Assert<
    Equal<(typeof MemberListbox.Message.SelectedItem.Type)['item'], MemberId>
  >,
  Assert<Equal<Effect.Services<typeof pairedServicefulOptionListbox>, never>>,
  Assert<Equal<(typeof FruitListbox.Message.SelectedItem.Type)['item'], Fruit>>,
  Assert<
    Equal<(typeof FruitMultiListbox.OutMessage.Selected.Type)['value'], Fruit>
  >,
  Assert<
    Equal<
      Parameters<typeof FruitListboxBinding.requestSelectItem>,
      [item: Fruit]
    >
  >,
  Assert<
    Equal<(typeof EncodedListbox.Message.SelectedItem.Encoded)['item'], number>
  >,
  Assert<
    Equal<
      (typeof EncodedMultiListbox.OutMessage.Selected.Encoded)['value'],
      number
    >
  >,
  Assert<Equal<Effect.Services<typeof selectedPicker>, Construction>>,
  Assert<Equal<Effect.Error<typeof selectedPicker>, ConstructionError>>,
  Assert<Equal<Effect.Services<typeof pairedQuotes>, never>>,
  Assert<Equal<Effect.Services<typeof pairedWindows>, never>>,
  Assert<Equal<Effect.Services<typeof pairedTabs>, never>>,
  Assert<Equal<Effect.Services<typeof selectedQuotes>, Construction>>,
  Assert<Equal<Effect.Error<typeof selectedQuotes>, ConstructionError>>,
  Assert<Equal<Effect.Services<typeof providedQuotes>, Construction>>,
]
