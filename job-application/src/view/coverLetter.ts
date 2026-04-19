import clsx from 'clsx'
import { Ui } from 'foldkit'
import { type Html } from 'foldkit/html'

import { Class, div, label, p, span, textarea } from '../html'
import { GotCoverLetterMessage } from '../message'
import { CoverLetter } from '../step'

const MAX_COVER_LETTER_LENGTH = 2000
const WARNING_THRESHOLD_CHARS = 200

export const coverLetterView = (model: CoverLetter.Model): Html => {
  const remaining = MAX_COVER_LETTER_LENGTH - model.content.length
  const isOverLimit = remaining < 0
  const isWarning = !isOverLimit && remaining <= WARNING_THRESHOLD_CHARS

  return Ui.Textarea.view({
    id: 'cover-letter',
    value: model.content,
    onInput: value =>
      GotCoverLetterMessage({
        message: CoverLetter.UpdatedContent({ value }),
      }),
    rows: 12,
    placeholder:
      'Tell us why you want to work on Foldkit and what excites you about the Elm Architecture...',
    isInvalid: isOverLimit,
    toView: attributes =>
      div(
        [Class('space-y-2')],
        [
          label(
            [
              ...attributes.label,
              Class('block text-sm font-medium text-gray-700'),
            ],
            ['Cover Letter'],
          ),
          textarea(
            [
              ...attributes.textarea,
              Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 data-[invalid]:border-red-500',
              ),
            ],
            [],
          ),
          div(
            [Class('flex justify-between text-sm')],
            [
              p(
                [Class('text-gray-500')],
                ['A strong cover letter helps your application stand out.'],
              ),
              span(
                [
                  Class(
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
  })
}
