import { Array, Option, Schema } from 'effect'
import { inertHtml as ih } from 'foldkit/html'

import { Listbox } from '@foldkit/ui'

import { Issue } from './domain'

const makeListboxOption = <Value extends string>(value: Schema.Schema<Value>) =>
  Schema.Struct({ value, label: Schema.String })

export const StringListboxOption = makeListboxOption(Schema.String)
export type StringListboxOption = typeof StringListboxOption.Type

export const StringListboxBlock = Listbox.makeBlock(
  StringListboxOption,
  Schema.String,
)

export const StatusListboxOption = makeListboxOption(Issue.Status)
export type StatusListboxOption = typeof StatusListboxOption.Type

export const StatusListboxBlock = Listbox.makeBlock(
  StatusListboxOption,
  Issue.Status,
)

export const PriorityListboxOption = makeListboxOption(Issue.Priority)
export type PriorityListboxOption = typeof PriorityListboxOption.Type

export const PriorityListboxBlock = Listbox.makeBlock(
  PriorityListboxOption,
  Issue.Priority,
)

export const SortListboxOption = makeListboxOption(Issue.SortBy)
export type SortListboxOption = typeof SortListboxOption.Type

export const SortListboxBlock = Listbox.makeBlock(
  SortListboxOption,
  Issue.SortBy,
)

export const GroupListboxOption = makeListboxOption(Issue.GroupBy)
export type GroupListboxOption = typeof GroupListboxOption.Type

export const GroupListboxBlock = Listbox.makeBlock(
  GroupListboxOption,
  Issue.GroupBy,
)

export const StatusFilterValue = Schema.Literals([
  'All',
  ...Issue.Status.literals,
])
export type StatusFilterValue = typeof StatusFilterValue.Type

export const StatusFilterListboxOption = makeListboxOption(StatusFilterValue)
export type StatusFilterListboxOption = typeof StatusFilterListboxOption.Type

export const StatusFilterListboxBlock = Listbox.makeBlock(
  StatusFilterListboxOption,
  StatusFilterValue,
)

const ListboxViewSettings = Schema.Struct({
  isDisabled: Schema.optionalKey(Schema.Boolean),
  isCompact: Schema.optionalKey(Schema.Boolean),
  ariaLabel: Schema.optionalKey(Schema.String),
})
type ListboxViewSettings = typeof ListboxViewSettings.Type

type ListboxOption<Value extends string> = StringListboxOption &
  Readonly<{ value: Value }>

type ListboxViewConfig<Value extends string> = ListboxViewSettings &
  Readonly<{
    value: Value
    options: ReadonlyArray<ListboxOption<Value>>
  }>

export const toListboxViewInputs = <const Value extends string>({
  value,
  options,
  isDisabled = false,
  isCompact = false,
  ariaLabel,
}: ListboxViewConfig<Value>): Listbox.ViewInputs<
  ListboxOption<Value>,
  Value
> => ({
  items: options,
  itemToValue: option => option.value,
  itemToSearchText: option => option.label,
  maybeSelectedValue: Option.some(value),
  isDisabled,
  ...(ariaLabel === undefined ? {} : { ariaLabel }),
  anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
  className: 'relative min-w-0 data-[open]:z-20',
  buttonClassName: isCompact ? 'listbox-trigger-compact' : 'listbox-trigger',
  itemsClassName:
    'popover-surface z-10 min-w-(--button-width) p-1 text-sm outline-none',
  itemsScrollClassName: 'max-h-64 overflow-y-auto overscroll-contain',
  backdropClassName: 'fixed inset-0 z-0',
  buttonContent: ih.div(
    [ih.Class('flex w-full min-w-0 items-center justify-between gap-3')],
    [
      ih.span(
        [ih.Class('truncate')],
        [
          Option.match(
            Array.findFirst(options, option => option.value === value),
            {
              onNone: () => 'Choose an option',
              onSome: option => option.label,
            },
          ),
        ],
      ),
      ih.svg(
        [
          ih.AriaHidden(true),
          ih.Class('size-4 shrink-0 text-slate-500'),
          ih.ViewBox('0 0 24 24'),
          ih.Fill('none'),
          ih.Stroke('currentColor'),
          ih.StrokeWidth('1.5'),
        ],
        [
          ih.path([
            ih.D('m6 9 6 6 6-6'),
            ih.StrokeLinecap('round'),
            ih.StrokeLinejoin('round'),
          ]),
        ],
      ),
    ],
  ),
  itemToConfig: option => ({
    className: 'group listbox-option',
    content: ih.div(
      [ih.Class('flex w-full min-w-0 items-center justify-between gap-3')],
      [
        ih.span([ih.Class('truncate')], [option.label]),
        ih.svg(
          [
            ih.AriaHidden(true),
            ih.Class(
              'invisible size-3.5 shrink-0 text-indigo-600 group-data-[selected]:visible',
            ),
            ih.ViewBox('0 0 24 24'),
            ih.Fill('none'),
            ih.Stroke('currentColor'),
            ih.StrokeWidth('1.75'),
          ],
          [
            ih.path([
              ih.D('m5 12 4 4L19 6'),
              ih.StrokeLinecap('round'),
              ih.StrokeLinejoin('round'),
            ]),
          ],
        ),
      ],
    ),
  }),
})
