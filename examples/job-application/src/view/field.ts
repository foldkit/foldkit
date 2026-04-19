import clsx from 'clsx'
import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import { type Field } from 'foldkit/fieldValidation'
import { type Html } from 'foldkit/html'

import {
  Class,
  Disabled,
  Value,
  div,
  input,
  keyed,
  label,
  option,
  select,
  span,
  textarea,
} from '../html'
import type { Message } from '../message'

const borderClass = (field: Field): string =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    }),
  )

export const inputField = (
  config: Readonly<{
    id: string
    label: string
    field: Field
    onInput: (value: string) => Message
    type?: string
    placeholder?: string
  }>,
): Html =>
  Ui.Input.view({
    id: config.id,
    value: config.field.value,
    onInput: config.onInput,
    isInvalid: config.field._tag === 'Invalid',
    ...(config.type !== undefined && { type: config.type }),
    ...(config.placeholder !== undefined && {
      placeholder: config.placeholder,
    }),
    toView: attributes =>
      keyed('div')(
        config.id,
        [Class('space-y-1')],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              label(
                [
                  ...attributes.label,
                  Class('block text-sm font-medium text-gray-700'),
                ],
                [config.label],
              ),
              ...M.value(config.field).pipe(
                M.tag('Validating', () => [
                  span(
                    [Class('text-blue-600 text-sm animate-spin')],
                    ['\u25D0'],
                  ),
                ]),
                M.tag('Valid', () => [
                  span([Class('text-green-600 text-sm')], ['\u2713']),
                ]),
                M.orElse(() => []),
              ),
            ],
          ),
          input([
            ...attributes.input,
            Class(
              clsx(
                'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                borderClass(config.field),
              ),
            ),
          ]),
          ...(config.field._tag === 'Invalid'
            ? [
                span(
                  [
                    ...attributes.description,
                    Class('block text-sm text-red-600 mt-0.5'),
                  ],
                  [config.field.errors[0]],
                ),
              ]
            : []),
        ],
      ),
  })

export const textareaField = (
  config: Readonly<{
    id: string
    label: string
    value: string
    onInput: (value: string) => Message
    rows?: number
    placeholder?: string
  }>,
): Html =>
  Ui.Textarea.view({
    id: config.id,
    value: config.value,
    onInput: config.onInput,
    rows: config.rows ?? 4,
    ...(config.placeholder !== undefined && {
      placeholder: config.placeholder,
    }),
    toView: attributes =>
      div(
        [Class('space-y-1')],
        [
          label(
            [
              ...attributes.label,
              Class('block text-sm font-medium text-gray-700'),
            ],
            [config.label],
          ),
          textarea(
            [
              ...attributes.textarea,
              Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
              ),
            ],
            [],
          ),
        ],
      ),
  })

export const selectField = (
  config: Readonly<{
    id: string
    label: string
    value: string
    onChange: (value: string) => Message
    options: ReadonlyArray<Readonly<{ value: string; label: string }>>
    placeholder?: string
  }>,
): Html =>
  Ui.Select.view({
    id: config.id,
    value: config.value,
    onChange: config.onChange,
    toView: attributes =>
      div(
        [Class('space-y-1')],
        [
          label(
            [
              ...attributes.label,
              Class('block text-sm font-medium text-gray-700'),
            ],
            [config.label],
          ),
          select(
            [
              ...attributes.select,
              Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
              ),
            ],
            [
              ...(config.placeholder
                ? [option([Value(''), Disabled(true)], [config.placeholder])]
                : []),
              ...config.options.map(({ value, label: optionLabel }) =>
                option([Value(value)], [optionLabel]),
              ),
            ],
          ),
        ],
      ),
  })
