import { clsx } from 'clsx'
import { Array } from 'effect'
import { Html } from 'foldkit/html'

import { Class, div, table, tbody, td, th, thead, tr } from '../html'

const columnBorder = 'border-r border-gray-300 dark:border-gray-700'

const headerCell = (text: string, isLastColumn: boolean): Html =>
  th(
    [
      Class(
        clsx(
          'px-4 py-3 text-left text-base font-semibold text-gray-900 dark:text-white',
          { [columnBorder]: !isLastColumn },
        ),
      ),
    ],
    [text],
  )

const cell = (
  content: ReadonlyArray<string | Html>,
  isFirstColumn: boolean,
  isLastColumn: boolean,
): Html =>
  td(
    [
      Class(
        clsx(
          'px-4 py-3 text-base min-w-[12rem]',
          isFirstColumn
            ? 'font-normal text-gray-900 dark:text-white'
            : 'text-gray-700 dark:text-gray-300',
          { [columnBorder]: !isLastColumn },
        ),
      ),
    ],
    content,
  )

export const comparisonTable = (
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<ReadonlyArray<string | Html>>>,
): Html =>
  div(
    [
      Class(
        'overflow-x-auto mb-6 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden',
      ),
    ],
    [
      table(
        [Class('w-full min-w-[40rem]')],
        [
          thead(
            [
              Class(
                'bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700',
              ),
            ],
            [
              tr(
                [],
                Array.map(headers, (header, index) =>
                  headerCell(header, index === headers.length - 1),
                ),
              ),
            ],
          ),
          tbody(
            [Class('bg-cream dark:bg-gray-900')],
            Array.map(rows, row =>
              tr(
                [
                  Class(
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
