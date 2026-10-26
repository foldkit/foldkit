import { Array, Option, Schema } from 'effect'
import { inertHtml as ih } from 'foldkit/html'

import { Listbox } from '@foldkit/ui'

import { GroupBy, IssueFilters, IssuePriority, IssueStatus } from './domain'

const makeListboxOption = <Value extends string>(value: Schema.Schema<Value>) =>
  Schema.Struct({ value, label: Schema.String })

export const ListboxOption = makeListboxOption(Schema.String)
export const StatusListboxOption = makeListboxOption(IssueStatus)
export const PriorityListboxOption = makeListboxOption(IssuePriority)
export const SortListboxOption = makeListboxOption(IssueFilters.fields.sort)
export const GroupListboxOption = makeListboxOption(GroupBy)
export const StatusFilterValue = Schema.Literals([
  'All',
  ...IssueStatus.literals,
])

export const StatusFilterListboxOption = makeListboxOption(StatusFilterValue)

export const WorkspaceListboxBlock = Listbox.create<typeof ListboxOption.Type>()

export const StatusListboxBlock = Listbox.create<
  typeof StatusListboxOption.Type,
  typeof IssueStatus.Type
>()

export const PriorityListboxBlock = Listbox.create<
  typeof PriorityListboxOption.Type,
  typeof IssuePriority.Type
>()

export const SortListboxBlock = Listbox.create<
  typeof SortListboxOption.Type,
  typeof IssueFilters.fields.sort.Type
>()

export const GroupListboxBlock = Listbox.create<
  typeof GroupListboxOption.Type,
  typeof GroupBy.Type
>()

export const StatusFilterListboxBlock = Listbox.create<
  typeof StatusFilterListboxOption.Type,
  typeof StatusFilterValue.Type
>()

const ListboxConfig = Schema.Struct({
  value: Schema.String,
  options: Schema.Array(ListboxOption),
  isDisabled: Schema.optionalKey(Schema.Boolean),
  isCompact: Schema.optionalKey(Schema.Boolean),
  ariaLabel: Schema.optionalKey(Schema.String),
})

type ListboxViewConfig<Value extends string> = Omit<
  typeof ListboxConfig.Type,
  'value' | 'options'
> &
  Readonly<{
    value: Value
    options: ReadonlyArray<ReturnType<typeof makeListboxOption<Value>>['Type']>
  }>

const itemToValue = <Item extends typeof ListboxOption.Type>(
  option: Item,
): Item['value'] => option.value

export const listboxViewInputs = <const Value extends string>({
  value,
  options,
  isDisabled = false,
  isCompact = false,
  ariaLabel,
}: ListboxViewConfig<Value>) =>
  ({
    items: options,
    itemToValue,
    itemToSearchText: (option: typeof ListboxOption.Type) => option.label,
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
    itemToConfig: (option: typeof ListboxOption.Type) => ({
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
  }) satisfies Listbox.ViewInputs<
    ReturnType<typeof makeListboxOption<Value>>['Type'],
    Value
  >
