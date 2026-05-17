import { Array } from 'effect'
import { Html, html } from 'foldkit/html'

import { type Message } from '../message'

// SHARED STYLES

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const rowClassName = 'border-b border-gray-200 dark:border-gray-700/50'

const cellClassName = 'py-2.5 pr-4 align-top'

const typeCellClassName = 'py-2.5 pr-4 align-top min-w-[20rem] max-w-md'

const descriptionCellClassName = 'py-2.5 align-top min-w-[18rem]'

const codeClassName =
  'bg-gray-200/70 dark:bg-gray-800 px-1 py-px rounded text-sm border border-gray-300/50 dark:border-gray-700/50 whitespace-nowrap'

const wrappingCodeClassName =
  'bg-gray-200/70 dark:bg-gray-800 px-1 py-px rounded text-sm border border-gray-300/50 dark:border-gray-700/50 whitespace-pre-wrap break-normal'

const inlineCode = (text: string): Html => {
  const h = html<Message>()

  return h.code([h.Class(codeClassName)], [text])
}

const wrappingInlineCode = (text: string): Html => {
  const h = html<Message>()

  return h.code([h.Class(wrappingCodeClassName)], [text])
}

// PROP TABLE

export type PropEntry = Readonly<{
  name: string
  type: string
  default?: string
  description: string | Html
}>

const propRow = (entry: PropEntry): Html => {
  const h = html<Message>()

  return h.tr(
    [h.Class(rowClassName)],
    [
      h.td([h.Class(cellClassName)], [inlineCode(entry.name)]),
      h.td([h.Class(typeCellClassName)], [wrappingInlineCode(entry.type)]),
      h.td(
        [h.Class(cellClassName)],
        [
          entry.default !== undefined
            ? inlineCode(entry.default)
            : h.span(
                [h.Class('text-gray-400 dark:text-gray-500 text-sm')],
                ['-'],
              ),
        ],
      ),
      h.td([h.Class(descriptionCellClassName)], [entry.description]),
    ],
  )
}

export const propTable = (entries: ReadonlyArray<PropEntry>): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-8 overflow-x-auto')],
    [
      h.table(
        [h.Class('w-full text-sm')],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                [
                  h.th([h.Class(headerCellClassName)], ['Name']),
                  h.th([h.Class(headerCellClassName)], ['Type']),
                  h.th([h.Class(headerCellClassName)], ['Default']),
                  h.th([h.Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          h.tbody([], Array.map(entries, propRow)),
        ],
      ),
    ],
  )
}

// KEYBOARD TABLE

export type KeyboardEntry = Readonly<{
  key: string
  description: string
}>

const keyboardKeyClassName =
  'inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300'

const keyboardRow = (entry: KeyboardEntry): Html => {
  const h = html<Message>()

  return h.tr(
    [h.Class(rowClassName)],
    [
      h.td(
        [h.Class(cellClassName)],
        [h.span([h.Class(keyboardKeyClassName)], [entry.key])],
      ),
      h.td([h.Class(descriptionCellClassName)], [entry.description]),
    ],
  )
}

export const keyboardTable = (entries: ReadonlyArray<KeyboardEntry>): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-8 overflow-x-auto')],
    [
      h.table(
        [h.Class('w-full text-sm')],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                [
                  h.th([h.Class(headerCellClassName)], ['Key']),
                  h.th([h.Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          h.tbody([], Array.map(entries, keyboardRow)),
        ],
      ),
    ],
  )
}

// DATA ATTRIBUTE TABLE

export type DataAttributeEntry = Readonly<{
  attribute: string
  condition: string
}>

const dataAttributeRow = (entry: DataAttributeEntry): Html => {
  const h = html<Message>()

  return h.tr(
    [h.Class(rowClassName)],
    [
      h.td([h.Class(cellClassName)], [inlineCode(entry.attribute)]),
      h.td([h.Class(descriptionCellClassName)], [entry.condition]),
    ],
  )
}

export const dataAttributeTable = (
  entries: ReadonlyArray<DataAttributeEntry>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-8 overflow-x-auto')],
    [
      h.table(
        [h.Class('w-full text-sm')],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                [
                  h.th([h.Class(headerCellClassName)], ['Attribute']),
                  h.th([h.Class(headerCellClassName)], ['Condition']),
                ],
              ),
            ],
          ),
          h.tbody([], Array.map(entries, dataAttributeRow)),
        ],
      ),
    ],
  )
}
