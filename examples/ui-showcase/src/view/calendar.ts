import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, Id, button, div, h2 } from '../html'
import type { Message as ParentMessage } from '../main'
import { GotCalendarBasicDemoMessage, type UiMessage } from '../message'
import type { UiModel } from '../model'

const containerClassName =
  'inline-flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm select-none'

const headerClassName = 'flex items-center justify-between gap-2'

const headingClassName = 'text-sm font-semibold text-gray-900 tabular-nums'

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

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Calendar']),
      Ui.Calendar.view({
        model: model.calendarBasicDemo,
        toParentMessage: message =>
          toParentMessage(GotCalendarBasicDemoMessage({ message })),
        toView: attributes =>
          div(
            [...attributes.root, Class(containerClassName)],
            [
              div(
                [Class(headerClassName)],
                [
                  button(
                    [
                      ...attributes.previousMonthButton,
                      Class(navButtonClassName),
                    ],
                    ['‹'],
                  ),
                  h2(
                    [Id(attributes.heading.id), Class(headingClassName)],
                    [attributes.heading.text],
                  ),
                  button(
                    [...attributes.nextMonthButton, Class(navButtonClassName)],
                    ['›'],
                  ),
                ],
              ),
              div(
                [...attributes.grid, Class(gridClassName)],
                [
                  div(
                    [...attributes.headerRow, Class(headerRowClassName)],
                    attributes.columnHeaders.map(header =>
                      div(
                        [...header.attributes, Class(columnHeaderClassName)],
                        [header.name],
                      ),
                    ),
                  ),
                  ...attributes.weeks.map(week =>
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
      }),
    ],
  )
