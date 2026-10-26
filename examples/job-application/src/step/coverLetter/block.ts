import clsx from 'clsx'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Textarea } from '@foldkit/ui'

const Model = Schema.Struct({
  content: Schema.String,
})

const Message = defineMessageUnion({
  UpdatedContent: { value: Schema.String },
})

const CoverLetterDefinition = Block.makeDefinition('CoverLetter', {
  Model,
  Message,
})

const { makeFieldsStep } = CoverLetterDefinition

const CoverLetterComposition = CoverLetterDefinition.makeComposition()

const init = CoverLetterComposition.makeInit(() => ({
  model: { content: '' },
}))

const update = CoverLetterComposition.makeUpdate({
  UpdatedContent: makeFieldsStep.fromMessage(({ value }) => ({
    content: () => value,
  })),
})

const MAX_COVER_LETTER_LENGTH = 2000
const WARNING_THRESHOLD_CHARS = 200

export const view = CoverLetterComposition.makeView((model, h) => {
  const remaining = MAX_COVER_LETTER_LENGTH - model.content.length
  const isOverLimit = remaining < 0
  const isWarning = !isOverLimit && remaining <= WARNING_THRESHOLD_CHARS

  return Textarea.view(
    {
      id: 'cover-letter',
      value: model.content,
      onInput: value => Message.UpdatedContent({ value }),
      rows: 12,
      placeholder:
        'Tell us why you want to work on Foldkit and what excites you about the Elm Architecture...',
      isInvalid: isOverLimit,
      toView: attributes =>
        h.div(
          [h.Class('space-y-2')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('block text-sm font-medium text-gray-700'),
              ],
              ['Cover Letter'],
            ),
            h.textarea([
              ...attributes.textarea,
              h.Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 data-[invalid]:border-red-500',
              ),
            ]),
            h.div(
              [h.Class('flex justify-between text-sm')],
              [
                h.p(
                  [h.Class('text-gray-500')],
                  ['A strong cover letter helps your application stand out.'],
                ),
                h.span(
                  [
                    h.Class(
                      clsx(
                        isOverLimit && 'font-medium text-red-600',
                        isWarning && 'font-medium text-amber-600',
                        !isOverLimit && !isWarning && 'text-gray-400',
                      ),
                    ),
                  ],
                  [`${remaining} characters remaining`],
                ),
              ],
            ),
          ],
        ),
    },
    h,
  )
})

const prepare = () =>
  CoverLetterComposition.prepareBlock({
    init,
    update,
    view,
  })
export const CoverLetterBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
