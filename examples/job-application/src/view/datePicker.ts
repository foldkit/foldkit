import { Match, Option } from 'effect'
import { type CalendarDate } from 'foldkit/calendar'
import { type Html, inertHtml as ih } from 'foldkit/html'

import { Calendar } from '@foldkit/ui'

import { fullDate } from './format'
import * as Icon from './icon'

export const triggerClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500'

export const panelClassName =
  'rounded-xl border border-gray-200 bg-white p-4 shadow-lg z-10 outline-none'

export const backdropClassName = 'fixed inset-0'

export const triggerContent = (
  maybeDate: Option.Option<CalendarDate>,
  placeholder: string,
): Html =>
  ih.div(
    [ih.Class('flex w-full items-center justify-between gap-2')],
    [
      Option.match(maybeDate, {
        onNone: () => ih.span([ih.Class('text-gray-400')], [placeholder]),
        onSome: date => ih.span([], [fullDate(date)]),
      }),
      ih.span([ih.Class('text-gray-400 shrink-0')], [Icon.chevronDown()]),
    ],
  )

const calendarWrapperClassName =
  'flex flex-col gap-3 select-none min-w-[248px] min-h-[260px]'

const navButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer'

const headingButtonClassName =
  'inline-flex items-center gap-2 text-sm font-semibold text-gray-900 tabular-nums px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100'

const headingTextClassName = 'text-sm font-semibold text-gray-900 tabular-nums'

const dayButtonClassName =
  'flex h-8 w-8 items-center justify-center rounded-full text-sm text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 group-data-[selected]:bg-indigo-600 group-data-[selected]:text-white! group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-indigo-500 group-data-[outside-month]:text-gray-400 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

const monthYearGridClassName =
  'grid grid-cols-3 grid-rows-4 gap-1 outline-none flex-1'

const monthYearButtonClassName =
  'flex h-full w-full items-center justify-center rounded-md text-sm text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 group-data-[selected]:bg-indigo-600 group-data-[selected]:text-white! group-data-[selected]:hover:bg-indigo-600 group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-indigo-500 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

export const calendarView = (attributes: Calendar.CalendarAttributes): Html =>
  Match.value(attributes).pipe(
    Match.tagsExhaustive({
      Days: days =>
        ih.div(
          [...days.root, ih.Class(calendarWrapperClassName)],
          [
            ih.div(
              [ih.Class('flex items-center justify-between gap-2')],
              [
                ih.button(
                  [...days.previousMonthButton, ih.Class(navButtonClassName)],
                  ['‹'],
                ),
                ih.button(
                  [
                    ih.Id(days.heading.id),
                    ...days.headingButton,
                    ih.Class(headingButtonClassName),
                  ],
                  [days.heading.text, Icon.chevronDown('w-3 h-3')],
                ),
                ih.button(
                  [...days.nextMonthButton, ih.Class(navButtonClassName)],
                  ['›'],
                ),
              ],
            ),
            ih.div(
              [...days.grid, ih.Class('flex flex-col gap-1 outline-none')],
              [
                ih.div(
                  [...days.headerRow, ih.Class('grid grid-cols-7 gap-1')],
                  days.columnHeaders.map(header =>
                    ih.div(
                      [
                        ...header.attributes,
                        ih.Class(
                          'text-center text-xs font-medium uppercase tracking-wide text-gray-500 py-1',
                        ),
                      ],
                      [header.name],
                    ),
                  ),
                ),
                ...days.weeks.map(week =>
                  ih.div(
                    [...week.attributes, ih.Class('grid grid-cols-7 gap-1')],
                    week.cells.map(cell =>
                      ih.div(
                        [
                          ...cell.cellAttributes,
                          ih.Class('group flex items-center justify-center'),
                        ],
                        [
                          ih.button(
                            [
                              ...cell.buttonAttributes,
                              ih.Class(dayButtonClassName),
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
        ih.div(
          [...months.root, ih.Class(calendarWrapperClassName)],
          [
            ih.div(
              [ih.Class('flex items-center justify-center gap-2')],
              [
                ih.button(
                  [
                    ih.Id(months.heading.id),
                    ...months.headingButton,
                    ih.Class(headingButtonClassName),
                  ],
                  [months.heading.text, Icon.chevronDown('w-3 h-3')],
                ),
              ],
            ),
            ih.div(
              [...months.grid, ih.Class(monthYearGridClassName)],
              months.cells.map(cell =>
                ih.div(
                  [
                    ...cell.cellAttributes,
                    ih.Class('group flex items-center justify-center'),
                  ],
                  [
                    ih.button(
                      [
                        ...cell.buttonAttributes,
                        ih.Class(monthYearButtonClassName),
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
        ih.div(
          [...years.root, ih.Class(calendarWrapperClassName)],
          [
            ih.div(
              [ih.Class('flex items-center justify-between gap-2')],
              [
                ih.button(
                  [...years.previousPageButton, ih.Class(navButtonClassName)],
                  ['‹'],
                ),
                ih.h2(
                  [ih.Id(years.heading.id), ih.Class(headingTextClassName)],
                  [years.heading.text],
                ),
                ih.button(
                  [...years.nextPageButton, ih.Class(navButtonClassName)],
                  ['›'],
                ),
              ],
            ),
            ih.div(
              [...years.grid, ih.Class(monthYearGridClassName)],
              years.cells.map(cell =>
                ih.div(
                  [
                    ...cell.cellAttributes,
                    ih.Class('group flex items-center justify-center'),
                  ],
                  [
                    ih.button(
                      [
                        ...cell.buttonAttributes,
                        ih.Class(monthYearButtonClassName),
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
  )
