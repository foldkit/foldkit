import { Option } from 'effect'
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

export const calendarView = (
  attributes: Ui.Calendar.CalendarAttributes<Message>,
): Html =>
  div(
    [...attributes.root, Class('flex flex-col gap-3 select-none')],
    [
      div(
        [Class('flex items-center justify-between gap-2')],
        [
          button(
            [
              ...attributes.previousMonthButton,
              Class(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer',
              ),
            ],
            ['\u2039'],
          ),
          h2(
            [
              Id(attributes.heading.id),
              Class('text-sm font-semibold text-gray-900 tabular-nums'),
            ],
            [attributes.heading.text],
          ),
          button(
            [
              ...attributes.nextMonthButton,
              Class(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer',
              ),
            ],
            ['\u203A'],
          ),
        ],
      ),
      div(
        [...attributes.grid, Class('flex flex-col gap-1 outline-none')],
        [
          div(
            [...attributes.headerRow, Class('grid grid-cols-7 gap-1')],
            attributes.columnHeaders.map(header =>
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
          ...attributes.weeks.map(week =>
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
                        Class(
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 group-data-[selected]:bg-indigo-600 group-data-[selected]:text-white! group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-indigo-500 group-data-[outside-month]:text-gray-400 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40',
                        ),
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
  )
