import { clsx } from 'clsx'
import { Array } from 'effect'
import { Html, html } from 'foldkit/html'

import { type Message } from '../message'

const columnBorder = 'border-r border-gray-300 dark:border-gray-700'

const headerCell = (text: string, isLastColumn: boolean): Html => {
  const h = html<Message>()

  return h.th(
    [
      h.Class(
        clsx(
          'px-4 py-3 text-left text-base font-semibold text-gray-900 dark:text-white',
          { [columnBorder]: !isLastColumn },
        ),
      ),
    ],
    [text],
  )
}

const cell = (
  content: ReadonlyArray<string | Html>,
  isFirstColumn: boolean,
  isLastColumn: boolean,
): Html => {
  const h = html<Message>()

  return h.td(
    [
      h.Class(
        clsx(
          'px-4 py-3 text-base min-w-[12rem] text-gray-800 dark:text-gray-200',
          { 'font-normal': isFirstColumn },
          { [columnBorder]: !isLastColumn },
        ),
      ),
    ],
    content,
  )
}

export const comparisonTable = (
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<ReadonlyArray<string | Html>>>,
): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'overflow-x-auto mb-6 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden',
      ),
    ],
    [
      h.table(
        [h.Class('w-full min-w-[40rem]')],
        [
          h.thead(
            [
              h.Class(
                'bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700',
              ),
            ],
            [
              h.tr(
                [],
                Array.map(headers, (header, index) =>
                  headerCell(header, index === headers.length - 1),
                ),
              ),
            ],
          ),
          h.tbody(
            [h.Class('bg-cream dark:bg-gray-900')],
            Array.map(rows, row =>
              h.tr(
                [
                  h.Class(
                    'border-b border-gray-300 dark:border-gray-700 last:border-b-0',
                  ),
                ],
                Array.map(row, (content, index) =>
                  cell(content, index === 0, index === row.length - 1),
                ),
              ),
            ),
          ),
        ],
      ),
    ],
  )
}
