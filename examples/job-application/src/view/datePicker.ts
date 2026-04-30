import { Match as M, Option } from 'effect'
import { Ui } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { type Html } from 'foldkit/html'

import { Class, Id, button, div, h2, span } from '../html'
import type { Message } from '../message'
import { fullDate } from './format'
import { chevronDown } from './icon'

export const triggerClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500'

export const panelClassName =
  'rounded-xl border border-gray-200 bg-white p-4 shadow-lg z-10 outline-none'

export const backdropClassName = 'fixed inset-0'

export const triggerContent = (
  maybeDate: Option.Option<CalendarDate>,
  placeholder: string,
): Html =>
  div(
    [Class('flex w-full items-center justify-between gap-2')],
    [
      Option.match(maybeDate, {
        onNone: () => span([Class('text-gray-400')], [placeholder]),
        onSome: date => span([], [fullDate(date)]),
      }),
      span([Class('text-gray-400 shrink-0')], [chevronDown()]),
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

export const calendarView = (
  attributes: Ui.Calendar.CalendarAttributes<Message>,
): Html =>
  M.value(attributes).pipe(
    M.tagsExhaustive({
      Days: days =>
        div(
          [...days.root, Class(calendarWrapperClassName)],
          [
            div(
              [Class('flex items-center justify-between gap-2')],
              [
                button(
                  [...days.previousMonthButton, Class(navButtonClassName)],
                  ['\u2039'],
                ),
                button(
                  [
                    Id(days.heading.id),
                    ...days.headingButton,
                    Class(headingButtonClassName),
                  ],
                  [days.heading.text, chevronDown('w-3 h-3')],
                ),
                button(
                  [...days.nextMonthButton, Class(navButtonClassName)],
                  ['\u203A'],
                ),
              ],
            ),
            div(
              [...days.grid, Class('flex flex-col gap-1 outline-none')],
              [
                div(
                  [...days.headerRow, Class('grid grid-cols-7 gap-1')],
                  days.columnHeaders.map(header =>
                    div(
                      [
                        ...header.attributes,
                        Class(
                          'text-center text-xs font-medium uppercase tracking-wide text-gray-500 py-1',
                        ),
                      ],
                      [header.name],
                    ),
                  ),
                ),
                ...days.weeks.map(week =>
                  div(
                    [...week.attributes, Class('grid grid-cols-7 gap-1')],
                    week.cells.map(cell =>
                      div(
                        [
                          ...cell.cellAttributes,
                          Class('group flex items-center justify-center'),
                        ],
                        [
                          button(
                            [
                              ...cell.buttonAttributes,
                              Class(dayButtonClassName),
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
        div(
          [...months.root, Class(calendarWrapperClassName)],
          [
            div(
              [Class('flex items-center justify-center gap-2')],
              [
                button(
                  [
                    Id(months.heading.id),
                    ...months.headingButton,
                    Class(headingButtonClassName),
                  ],
                  [months.heading.text, chevronDown('w-3 h-3')],
                ),
              ],
            ),
            div(
              [...months.grid, Class(monthYearGridClassName)],
              months.cells.map(cell =>
                div(
                  [
                    ...cell.cellAttributes,
                    Class('group flex items-center justify-center'),
                  ],
                  [
                    button(
                      [
                        ...cell.buttonAttributes,
                        Class(monthYearButtonClassName),
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
        div(
          [...years.root, Class(calendarWrapperClassName)],
          [
            div(
              [Class('flex items-center justify-between gap-2')],
              [
                button(
                  [...years.previousPageButton, Class(navButtonClassName)],
                  ['\u2039'],
                ),
                h2(
                  [Id(years.heading.id), Class(headingTextClassName)],
                  [years.heading.text],
                ),
                button(
                  [...years.nextPageButton, Class(navButtonClassName)],
                  ['\u203A'],
                ),
              ],
            ),
            div(
              [...years.grid, Class(monthYearGridClassName)],
              years.cells.map(cell =>
                div(
                  [
                    ...cell.cellAttributes,
                    Class('group flex items-center justify-center'),
                  ],
                  [
                    button(
                      [
                        ...cell.buttonAttributes,
                        Class(monthYearButtonClassName),
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
