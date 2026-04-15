import { Array } from 'effect'
import type { Html } from 'foldkit/html'

import {
  Class,
  code,
  div,
  span,
  table,
  tbody,
  td,
  th,
  thead,
  tr,
} from '../html'

// SHARED STYLES

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const rowClassName = 'border-b border-gray-200 dark:border-gray-700/50'

const cellClassName = 'py-2.5 pr-4 align-top'

const descriptionCellClassName = 'py-2.5 align-top min-w-[24rem]'

const codeClassName =
  'bg-gray-200/70 dark:bg-gray-800 px-1 py-px rounded text-sm border border-gray-300/50 dark:border-gray-700/50 whitespace-nowrap'

const inlineCode = (text: string): Html => code([Class(codeClassName)], [text])

// PROP TABLE

export type PropEntry = Readonly<{
  name: string
  type: string
  default?: string
  description: string | Html
}>

const propRow = (entry: PropEntry): Html =>
  tr(
    [Class(rowClassName)],
    [
      td([Class(cellClassName)], [inlineCode(entry.name)]),
      td([Class(cellClassName)], [inlineCode(entry.type)]),
      td(
        [Class(cellClassName)],
        [
          entry.default !== undefined
            ? inlineCode(entry.default)
            : span([Class('text-gray-400 dark:text-gray-500 text-sm')], ['-']),
        ],
      ),
      td([Class(descriptionCellClassName)], [entry.description]),
    ],
  )

export const propTable = (entries: ReadonlyArray<PropEntry>): Html =>
  div(
    [Class('mb-8 overflow-x-auto')],
    [
      table(
        [Class('w-full text-sm')],
        [
          thead(
            [],
            [
              tr(
                [],
                [
                  th([Class(headerCellClassName)], ['Name']),
                  th([Class(headerCellClassName)], ['Type']),
                  th([Class(headerCellClassName)], ['Default']),
                  th([Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          tbody([], Array.map(entries, propRow)),
        ],
      ),
    ],
  )

// KEYBOARD TABLE

export type KeyboardEntry = Readonly<{
  key: string
  description: string
}>

const keyboardKeyClassName =
  'inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300'

const keyboardRow = (entry: KeyboardEntry): Html =>
  tr(
    [Class(rowClassName)],
    [
      td(
        [Class(cellClassName)],
        [span([Class(keyboardKeyClassName)], [entry.key])],
      ),
      td([Class(descriptionCellClassName)], [entry.description]),
    ],
  )

export const keyboardTable = (entries: ReadonlyArray<KeyboardEntry>): Html =>
  div(
    [Class('mb-8 overflow-x-auto')],
    [
      table(
        [Class('w-full text-sm')],
        [
          thead(
            [],
            [
              tr(
                [],
                [
                  th([Class(headerCellClassName)], ['Key']),
                  th([Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          tbody([], Array.map(entries, keyboardRow)),
        ],
      ),
    ],
  )

// DATA ATTRIBUTE TABLE

export type DataAttributeEntry = Readonly<{
  attribute: string
  condition: string
}>

const dataAttributeRow = (entry: DataAttributeEntry): Html =>
  tr(
    [Class(rowClassName)],
    [
      td([Class(cellClassName)], [inlineCode(entry.attribute)]),
      td([Class(descriptionCellClassName)], [entry.condition]),
    ],
  )

export const dataAttributeTable = (
  entries: ReadonlyArray<DataAttributeEntry>,
): Html =>
  div(
    [Class('mb-8 overflow-x-auto')],
    [
      table(
        [Class('w-full text-sm')],
        [
          thead(
            [],
            [
              tr(
                [],
                [
                  th([Class(headerCellClassName)], ['Attribute']),
                  th([Class(headerCellClassName)], ['Condition']),
                ],
              ),
            ],
          ),
          tbody([], Array.map(entries, dataAttributeRow)),
        ],
      ),
    ],
  )
