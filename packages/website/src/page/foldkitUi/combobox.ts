import { Array, Option } from 'effect'
import { Ui } from 'foldkit'

import { Class, div, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import { GotComboboxDemoMessage, type Message } from './message'

// TABLE OF CONTENTS

export const comboboxHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'combobox',
  text: 'Combobox',
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
    div(
      [Class('mt-6')],
      [
        Ui.Combobox.view({
          model: comboboxModel,
          toMessage: message =>
            toMessage(GotComboboxDemoMessage({ message })),
          items: filteredShapes,
          itemToConfig: shape => {
            const isSelected = Option.exists(
              comboboxModel.maybeSelectedItem,
              selectedItem => selectedItem === shape,
            )

            return {
              className: itemClassName,
              content: div(
                [Class('flex items-center gap-2')],
                [
                  Icon.check(
                    `w-4 h-4 shrink-0 ${isSelected ? 'visible' : 'invisible'} text-gray-900 dark:text-white`,
                  ),
                  span([], [shape]),
                ],
              ),
            }
          },
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
