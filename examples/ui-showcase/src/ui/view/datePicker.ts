import { Match as M, Option } from 'effect'
import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/popover'

import * as Icon from '../../icon'
import { GotDatePickerBasicDemoMessage, type UiMessage } from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'inline-flex items-center justify-between gap-2 min-w-48 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const triggerContentClassName = 'flex w-full items-center justify-between gap-4'

const placeholderClassName = 'text-gray-500'

const panelClassName =
  'rounded-xl border border-gray-200 bg-white p-4 shadow-lg z-10 outline-none'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const calendarWrapperClassName =
  'flex flex-col gap-3 select-none min-w-[268px] min-h-[284px]'

const headerClassName = 'flex items-center justify-between gap-2'

const headingButtonClassName =
  'inline-flex items-center gap-2 text-sm font-semibold text-gray-900 tabular-nums px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100'

const headingTextClassName = 'text-sm font-semibold text-gray-900 tabular-nums'

const navButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer'

const gridClassName = 'flex flex-col gap-1 outline-none'

const headerRowClassName = 'grid grid-cols-7 gap-1'

const columnHeaderClassName =
  'text-center text-xs font-medium uppercase tracking-wide text-gray-500 py-1'

const weekRowClassName = 'grid grid-cols-7 gap-1'

const cellClassName = 'group flex items-center justify-center'

const dayButtonClassName =
  'flex h-9 w-9 items-center justify-center rounded-full text-sm text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white! group-data-[selected]:hover:bg-accent-600 group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-accent-500 group-data-[outside-month]:text-gray-400 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

const monthYearGridClassName =
  'grid grid-cols-3 grid-rows-4 gap-1 outline-none flex-1'

const monthYearCellClassName = 'group flex items-center justify-center'

const monthYearButtonClassName =
  'flex h-full w-full items-center justify-center rounded-md text-sm text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white! group-data-[selected]:hover:bg-accent-600 group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-accent-500 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

const DATE_PICKER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const formatTriggerLabel = (
  date: Readonly<{ year: number; month: number; day: number }>,
): string =>
  `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`

const triggerContent = (
  maybeDate: Option.Option<
    Readonly<{ year: number; month: number; day: number }>
  >,
): Html => {
  const h = html()

  return h.div(
    [h.Class(triggerContentClassName)],
    [
      Option.match(maybeDate, {
        onNone: () => h.span([h.Class(placeholderClassName)], ['Pick a date']),
        onSome: date => h.span([], [formatTriggerLabel(date)]),
      }),
      Icon.chevronDown('w-4 h-4'),
    ],
  )
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Date Picker']),
      h.submodel({
        slotId: model.datePickerBasicDemo.id,
        model: model.datePickerBasicDemo,
        view: Ui.DatePicker.view,
        viewInputs: {
          anchor: DATE_PICKER_ANCHOR,
          triggerContent: maybeDate => triggerContent(maybeDate),
          triggerClassName,
          panelClassName,
          backdropClassName,
          className: wrapperClassName,
          toCalendarView: attributes =>
            M.value(attributes).pipe(
              M.tagsExhaustive({
                Days: days =>
                  h.div(
                    [...days.root, h.Class(calendarWrapperClassName)],
                    [
                      h.div(
                        [h.Class(headerClassName)],
                        [
                          h.button(
                            [
                              ...days.previousMonthButton,
                              h.Class(navButtonClassName),
                            ],
                            [Icon.chevronLeft('w-5 h-5')],
                          ),
                          h.button(
                            [
                              h.Id(days.heading.id),
                              ...days.headingButton,
                              h.Class(headingButtonClassName),
                            ],
                            [days.heading.text, Icon.chevronDown('w-3 h-3')],
                          ),
                          h.button(
                            [
                              ...days.nextMonthButton,
                              h.Class(navButtonClassName),
                            ],
                            [Icon.chevronRight('w-5 h-5')],
                          ),
                        ],
                      ),
                      h.div(
                        [...days.grid, h.Class(gridClassName)],
                        [
                          h.div(
                            [...days.headerRow, h.Class(headerRowClassName)],
                            days.columnHeaders.map(header =>
                              h.div(
                                [
                                  ...header.attributes,
                                  h.Class(columnHeaderClassName),
                                ],
                                [header.name],
                              ),
                            ),
                          ),
                          ...days.weeks.map(week =>
                            h.div(
                              [...week.attributes, h.Class(weekRowClassName)],
                              week.cells.map(cell =>
                                h.div(
                                  [
                                    ...cell.cellAttributes,
                                    h.Class(cellClassName),
                                  ],
                                  [
                                    h.button(
                                      [
                                        ...cell.buttonAttributes,
                                        h.Class(dayButtonClassName),
                                      ],
                                      [cell.label],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                Months: months =>
                  h.div(
                    [...months.root, h.Class(calendarWrapperClassName)],
                    [
                      h.div(
                        [h.Class(`${headerClassName} justify-center`)],
                        [
                          h.button(
                            [
                              h.Id(months.heading.id),
                              ...months.headingButton,
                              h.Class(headingButtonClassName),
                            ],
                            [months.heading.text, Icon.chevronDown('w-3 h-3')],
                          ),
                        ],
                      ),
                      h.div(
                        [...months.grid, h.Class(monthYearGridClassName)],
                        months.cells.map(cell =>
                          h.div(
                            [
                              ...cell.cellAttributes,
                              h.Class(monthYearCellClassName),
                            ],
                            [
                              h.button(
                                [
                                  ...cell.buttonAttributes,
                                  h.Class(monthYearButtonClassName),
                                ],
                                [cell.shortLabel],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                Years: years =>
                  h.div(
                    [...years.root, h.Class(calendarWrapperClassName)],
                    [
                      h.div(
                        [h.Class(headerClassName)],
                        [
                          h.button(
                            [
                              ...years.previousPageButton,
                              h.Class(navButtonClassName),
                            ],
                            [Icon.chevronLeft('w-5 h-5')],
                          ),
                          h.h2(
                            [
                              h.Id(years.heading.id),
                              h.Class(headingTextClassName),
                            ],
                            [years.heading.text],
                          ),
                          h.button(
                            [
                              ...years.nextPageButton,
                              h.Class(navButtonClassName),
                            ],
                            [Icon.chevronRight('w-5 h-5')],
                          ),
                        ],
                      ),
                      h.div(
                        [...years.grid, h.Class(monthYearGridClassName)],
                        years.cells.map(cell =>
                          h.div(
                            [
                              ...cell.cellAttributes,
                              h.Class(monthYearCellClassName),
                            ],
                            [
                              h.button(
                                [
                                  ...cell.buttonAttributes,
                                  h.Class(monthYearButtonClassName),
                                ],
                                [cell.label],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
              }),
            ),
        },
        toParentMessage: message => GotDatePickerBasicDemoMessage({ message }),
      }),
    ],
  )
})
