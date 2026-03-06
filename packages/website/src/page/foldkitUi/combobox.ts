import classNames from 'classnames'
import { Array } from 'effect'
import { Ui } from 'foldkit'

import { Class, div, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading, inlineCode, subPara } from '../../prose'
import {
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const comboboxHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'combobox',
  text: 'Combobox',
}

export const singleSelectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-single-select',
  text: 'Single-Select',
}

export const nullableHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-nullable',
  text: 'Nullable',
}

export const selectOnFocusHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-select-on-focus',
  text: 'Select on Focus',
}

export const multiHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-multi',
  text: 'Multi-Select',
}

// DEMO CONTENT

type Shape =
  | 'Tesseract'
  | 'Pentatope'
  | 'Icositetrachoron'
  | 'Hecatonicosachoron'
  | 'Hexacosichoron'
  | 'Dodecaplex'

const SHAPES: ReadonlyArray<Shape> = [
  'Tesseract',
  'Pentatope',
  'Icositetrachoron',
  'Hecatonicosachoron',
  'Hexacosichoron',
  'Dodecaplex',
]

const inputClassName =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white pl-3 pr-10 py-2 text-base outline-none focus:ring-2 focus:ring-accent-500'

const buttonClassName =
  'absolute inset-y-0 right-0 flex items-center px-4 cursor-pointer text-gray-900 dark:text-white'

const itemsClassName =
  'absolute mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg overflow-hidden z-10 outline-none'

const itemClassName =
  'px-3 py-2 text-base text-gray-700 dark:text-gray-200 cursor-pointer data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700/50 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative w-72'

const filterShapes = (inputValue: string): ReadonlyArray<Shape> =>
  inputValue === ''
    ? SHAPES
    : Array.filter(SHAPES, shape =>
        shape.toLowerCase().includes(inputValue.toLowerCase()),
      )

// VIEW

export const comboboxDemo = (
  comboboxModel: Ui.Combobox.Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const filteredShapes = filterShapes(comboboxModel.inputValue)

  return [
    heading('h3', singleSelectHeader.id, singleSelectHeader.text),
    div(
      [Class('relative')],
      [
        Ui.Combobox.view({
          model: comboboxModel,
          toMessage: message =>
            toMessage(GotComboboxDemoMessage({ message })),
          items: filteredShapes,
          itemToConfig: (shape, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  classNames(
                    'w-4 h-4 shrink-0 text-gray-900 dark:text-white',
                    {
                      visible: context.isSelected,
                      invisible: !context.isSelected,
                    },
                  ),
                ),
                span([], [shape]),
              ],
            ),
          }),
          itemToValue: shape => shape,
          itemToDisplayText: shape => shape,
          inputClassName,
          inputPlaceholder: 'Search polytopes...',
          itemsClassName,
          backdropClassName,
          className: wrapperClassName,
          inputWrapperClassName: 'relative',
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonClassName,
        }),
      ],
    ),
  ]
}

export const nullableDemo = (
  comboboxNullableModel: Ui.Combobox.Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const filteredShapes = filterShapes(
    comboboxNullableModel.inputValue,
  )

  return [
    heading('h3', nullableHeader.id, nullableHeader.text),
    div(
      [Class('relative')],
      [
        Ui.Combobox.view({
          model: comboboxNullableModel,
          toMessage: message =>
            toMessage(GotComboboxNullableDemoMessage({ message })),
          items: filteredShapes,
          itemToConfig: (shape, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  classNames(
                    'w-4 h-4 shrink-0 text-gray-900 dark:text-white',
                    {
                      visible: context.isSelected,
                      invisible: !context.isSelected,
                    },
                  ),
                ),
                span([], [shape]),
              ],
            ),
          }),
          itemToValue: shape => shape,
          itemToDisplayText: shape => shape,
          inputClassName,
          inputPlaceholder: 'Search polytopes...',
          itemsClassName,
          backdropClassName,
          className: wrapperClassName,
          inputWrapperClassName: 'relative',
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonClassName,
        }),
      ],
    ),
  ]
}

export const selectOnFocusDemo = (
  comboboxSelectOnFocusModel: Ui.Combobox.Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const filteredShapes = filterShapes(
    comboboxSelectOnFocusModel.inputValue,
  )

  return [
    heading('h3', selectOnFocusHeader.id, selectOnFocusHeader.text),
    subPara(
      'Pass ',
      inlineCode('selectInputOnFocus: true', 'text-xs px-0.5'),
      ' to highlight the input text when the combobox receives focus. Typing immediately replaces the current value, making it easy to start a new search without manually clearing the input.',
    ),
    div(
      [Class('relative')],
      [
        Ui.Combobox.view({
          model: comboboxSelectOnFocusModel,
          toMessage: message =>
            toMessage(
              GotComboboxSelectOnFocusDemoMessage({ message }),
            ),
          items: filteredShapes,
          itemToConfig: (shape, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  classNames(
                    'w-4 h-4 shrink-0 text-gray-900 dark:text-white',
                    {
                      visible: context.isSelected,
                      invisible: !context.isSelected,
                    },
                  ),
                ),
                span([], [shape]),
              ],
            ),
          }),
          itemToValue: shape => shape,
          itemToDisplayText: shape => shape,
          inputClassName,
          inputPlaceholder: 'Search polytopes...',
          itemsClassName,
          backdropClassName,
          className: wrapperClassName,
          inputWrapperClassName: 'relative',
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonClassName,
        }),
      ],
    ),
  ]
}

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'

const emptyTagClassName =
  'text-sm py-0.5 text-gray-400 dark:text-gray-500'

export const multiDemo = (
  comboboxMultiModel: Ui.Combobox.Multi.Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const filteredShapes = filterShapes(comboboxMultiModel.inputValue)

  return [
    heading('h3', multiHeader.id, multiHeader.text),
    div(
      [Class('relative')],
      [
        div(
          [Class('flex flex-wrap gap-1.5 mb-2')],
          Array.match(comboboxMultiModel.selectedItems, {
            onEmpty: () => [
              span([Class(emptyTagClassName)], ['No selection']),
            ],
            onNonEmpty: selectedItems =>
              selectedItems.map(item =>
                span([Class(tagClassName)], [item]),
              ),
          }),
        ),
        Ui.Combobox.Multi.view({
          model: comboboxMultiModel,
          toMessage: message =>
            toMessage(GotComboboxMultiDemoMessage({ message })),
          items: filteredShapes,
          itemToConfig: (shape, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  classNames(
                    'w-4 h-4 shrink-0 text-gray-900 dark:text-white',
                    {
                      visible: context.isSelected,
                      invisible: !context.isSelected,
                    },
                  ),
                ),
                span([], [shape]),
              ],
            ),
          }),
          itemToValue: shape => shape,
          itemToDisplayText: shape => shape,
          inputClassName,
          inputPlaceholder: 'Search polytopes...',
          itemsClassName,
          backdropClassName,
          className: wrapperClassName,
          inputWrapperClassName: 'relative',
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonClassName,
        }),
      ],
    ),
  ]
}
