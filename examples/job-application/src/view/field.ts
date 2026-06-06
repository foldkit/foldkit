import clsx from 'clsx'
import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import { type Field } from 'foldkit/fieldValidation'
import { type Html, html } from 'foldkit/html'

const borderClass = (field: Field<string>): string =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    }),
  )

export const inputField = <ParentMessage>(
  config: Readonly<{
    id: string
    label: string
    field: Field<string>
    onInput: (value: string) => ParentMessage
    type?: string
    placeholder?: string
  }>,
): Html => {
  const h = html<ParentMessage>()

  return Ui.Input.view({
    id: config.id,
    value: config.field.value,
    onInput: config.onInput,
    isInvalid: config.field._tag === 'Invalid',
    ...(config.type !== undefined && { type: config.type }),
    ...(config.placeholder !== undefined && {
      placeholder: config.placeholder,
    }),
    toView: attributes =>
      h.keyed('div')(
        config.id,
        [h.Class('space-y-1')],
        [
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              h.label(
                [
                  ...attributes.label,
                  h.Class('block text-sm font-medium text-gray-700'),
                ],
                [config.label],
              ),
              ...M.value(config.field).pipe(
                M.tag('Validating', () => [
                  h.span(
                    [h.Class('text-blue-600 text-sm animate-spin')],
                    ['◐'],
                  ),
                ]),
                M.tag('Valid', () => [
                  h.span([h.Class('text-green-600 text-sm')], ['✓']),
                ]),
                M.orElse(() => []),
              ),
            ],
          ),
          h.input([
            ...attributes.input,
            h.Class(
              clsx(
                'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                borderClass(config.field),
              ),
            ),
          ]),
          ...(config.field._tag === 'Invalid'
            ? [
                h.span(
                  [
                    ...attributes.description,
                    h.Class('block text-sm text-red-600 mt-0.5'),
                  ],
                  [config.field.errors[0]],
                ),
              ]
            : []),
        ],
      ),
  })
}

export const textareaField = <ParentMessage>(
  config: Readonly<{
    id: string
    label: string
    value: string
    onInput: (value: string) => ParentMessage
    rows?: number
    placeholder?: string
  }>,
): Html => {
  const h = html<ParentMessage>()

  return Ui.Textarea.view({
    id: config.id,
    value: config.value,
    onInput: config.onInput,
    rows: config.rows ?? 4,
    ...(config.placeholder !== undefined && {
      placeholder: config.placeholder,
    }),
    toView: attributes =>
      h.div(
        [h.Class('space-y-1')],
        [
          h.label(
            [
              ...attributes.label,
              h.Class('block text-sm font-medium text-gray-700'),
            ],
            [config.label],
          ),
          h.textarea(
            [
              ...attributes.textarea,
              h.Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
              ),
            ],
            [],
          ),
        ],
      ),
  })
}

export const selectField = <ParentMessage>(
  config: Readonly<{
    id: string
    label: string
    value: string
    onChange: (value: string) => ParentMessage
    options: ReadonlyArray<Readonly<{ value: string; label: string }>>
    placeholder?: string
  }>,
): Html => {
  const h = html<ParentMessage>()

  return Ui.Select.view({
    id: config.id,
    value: config.value,
    onChange: config.onChange,
    toView: attributes =>
      h.div(
        [h.Class('space-y-1')],
        [
          h.label(
            [
              ...attributes.label,
              h.Class('block text-sm font-medium text-gray-700'),
            ],
            [config.label],
          ),
          h.select(
            [
              ...attributes.select,
              h.Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
              ),
            ],
            [
              ...(config.placeholder
                ? [
                    h.option(
                      [h.Value(''), h.Disabled(true)],
                      [config.placeholder],
                    ),
                  ]
                : []),
              ...config.options.map(({ value, label: optionLabel }) =>
                h.option([h.Value(value)], [optionLabel]),
              ),
            ],
          ),
        ],
      ),
  })
}
