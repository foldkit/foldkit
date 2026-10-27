import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Plan = Schema.Literals(['Startup', 'Business', 'Enterprise'])

export const DemoTab = Schema.Literals(['Foldkit', 'React', 'Elm'])

export const City = Schema.Literals([
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
])

export const ListboxItem = Schema.Literals([
  'Michael Bluth',
  'Lindsay Funke',
  'Gob Bluth',
  'George Michael',
  'Maeby Funke',
  'Buster Bluth',
  'Tobias Funke',
  'Lucille Bluth',
])

export const DemoCard = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
})

export const DemoColumn = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  cards: Schema.Array(DemoCard),
})

export const VirtualListChatMessage = Schema.Struct({
  id: Schema.Number,
  body: Schema.String,
  isExpanded: Schema.Boolean,
})

export const VirtualListChatHistorySource = defineTaggedUnion({
  Unbounded: {},
  Finite: { remainingCount: Schema.Number },
})

export const VirtualListChatHistoryMode = Schema.Literals([
  'Infinite',
  'Finite',
])

export const historyModeForSource = (
  source: typeof VirtualListChatHistorySource.Type,
): typeof VirtualListChatHistoryMode.Type =>
  VirtualListChatHistorySource.match<typeof VirtualListChatHistoryMode.Type>(
    source,
    {
      Unbounded: () => 'Infinite',
      Finite: () => 'Finite',
    },
  )

export const VirtualListChatHistoryLoad = defineTaggedUnion({
  Idle: {},
  Loading: { trigger: Schema.Literals(['Scroll', 'Button']) },
})

export const Page = Schema.Literals([
  'Anchor',
  'Animation',
  'Button',
  'Calendar',
  'Checkbox',
  'Combobox',
  'DatePicker',
  'Dialog',
  'Disclosure',
  'DragAndDrop',
  'Fieldset',
  'FileDrop',
  'HoverIntent',
  'Input',
  'Listbox',
  'Menu',
  'Meter',
  'Nav',
  'Overview',
  'Popover',
  'Progress',
  'RadioGroup',
  'Select',
  'SelectionBlocks',
  'Slider',
  'Switch',
  'Tabs',
  'Textarea',
  'Toast',
  'Tooltip',
  'VirtualList',
])
