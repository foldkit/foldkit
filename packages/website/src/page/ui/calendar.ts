import { Match as M } from 'effect'
import { Ui } from 'foldkit'

import { Class, Id, button, div, h2 } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import { GotCalendarBasicDemoMessage, type Message } from './message'
import type { Model } from './model'

// DEMO CONTENT

const containerClassName =
  'inline-flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm select-none min-w-[304px] min-h-[324px]'

const headerClassName = 'flex items-center justify-between gap-2'

const headingButtonClassName =
  'inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white tabular-nums px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'

const headingTextClassName =
  'text-sm font-semibold text-gray-900 dark:text-white tabular-nums'

const navButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'

const gridClassName = 'flex flex-col gap-1 outline-none'

const headerRowClassName = 'grid grid-cols-7 gap-1'

const columnHeaderClassName =
  'text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 py-1'

const weekRowClassName = 'grid grid-cols-7 gap-1'

const cellClassName = 'group flex items-center justify-center'

const dayButtonClassName =
  'flex h-9 w-9 items-center justify-center rounded-full text-sm text-gray-900 dark:text-gray-100 tabular-nums cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 dark:group-data-[today]:ring-gray-500 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white! group-data-[selected]:hover:bg-accent-600 group-data-[selected]:dark:hover:bg-accent-600 group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-accent-500 group-data-[outside-month]:text-gray-400 dark:group-data-[outside-month]:text-gray-600 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

const monthYearGridClassName =
  'grid grid-cols-3 grid-rows-4 gap-1 outline-none flex-1'

const monthYearCellClassName = 'group flex items-center justify-center'

const monthYearButtonClassName =
  'flex h-full w-full items-center justify-center rounded-md text-sm text-gray-900 dark:text-gray-100 tabular-nums cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 dark:group-data-[today]:ring-gray-500 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white! group-data-[selected]:hover:bg-accent-600 group-data-[selected]:dark:hover:bg-accent-600 group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-accent-500 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

// VIEW

export const basicDemo = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  Ui.Calendar.view({
    model: model.calendarBasicDemo,
    toParentMessage: message =>
      toParentMessage(GotCalendarBasicDemoMessage({ message })),
    toView: attributes =>
      M.value(attributes).pipe(
        M.tagsExhaustive({
          Days: days =>
            div(
              [...days.root, Class(containerClassName)],
              [
                div(
                  [Class(headerClassName)],
                  [
                    button(
                      [...days.previousMonthButton, Class(navButtonClassName)],
                      [Icon.chevronLeft('w-5 h-5')],
                    ),
                    button(
                      [
                        Id(days.heading.id),
                        ...days.headingButton,
                        Class(headingButtonClassName),
                      ],
                      [days.heading.text, Icon.chevronDown('w-3 h-3')],
                    ),
                    button(
                      [...days.nextMonthButton, Class(navButtonClassName)],
                      [Icon.chevronRight('w-5 h-5')],
                    ),
                  ],
                ),
                div(
                  [...days.grid, Class(gridClassName)],
                  [
                    div(
                      [...days.headerRow, Class(headerRowClassName)],
                      days.columnHeaders.map(header =>
                        div(
                          [...header.attributes, Class(columnHeaderClassName)],
                          [header.name],
                        ),
                      ),
                    ),
                    ...days.weeks.map(week =>
                      div(
                        [...week.attributes, Class(weekRowClassName)],
                        week.cells.map(cell =>
                          div(
                            [...cell.cellAttributes, Class(cellClassName)],
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
              [...months.root, Class(containerClassName)],
              [
                div(
                  [Class(`${headerClassName} justify-center`)],
                  [
                    button(
                      [
                        Id(months.heading.id),
                        ...months.headingButton,
                        Class(headingButtonClassName),
                      ],
                      [months.heading.text, Icon.chevronDown('w-3 h-3')],
                    ),
                  ],
                ),
                div(
                  [...months.grid, Class(monthYearGridClassName)],
                  months.cells.map(cell =>
                    div(
                      [...cell.cellAttributes, Class(monthYearCellClassName)],
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
              [...years.root, Class(containerClassName)],
              [
                div(
                  [Class(headerClassName)],
                  [
                    button(
                      [...years.previousPageButton, Class(navButtonClassName)],
                      [Icon.chevronLeft('w-5 h-5')],
                    ),
                    h2(
                      [Id(years.heading.id), Class(headingTextClassName)],
                      [years.heading.text],
                    ),
                    button(
                      [...years.nextPageButton, Class(navButtonClassName)],
                      [Icon.chevronRight('w-5 h-5')],
                    ),
                  ],
                ),
                div(
                  [...years.grid, Class(monthYearGridClassName)],
                  years.cells.map(cell =>
                    div(
                      [...cell.cellAttributes, Class(monthYearCellClassName)],
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
      ),
  }),
]
