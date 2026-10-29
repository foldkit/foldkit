import { clsx } from 'clsx'
import { Array, Option } from 'effect'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'
import type { OptionInfo } from '@foldkit/ui/radioGroup'

import {
  type ApplicationViewBuilder,
  EditionRadioGroupBinding,
} from '../composition'
import * as Icon from '../icon'
import { Message } from '../message'
import { EDITIONS, EditionRadioGroupBlock, editionName } from '../model'
import type { CartState } from '../model'
import { bookCoverView } from './header'
import {
  cancelButtonClassName,
  editionDescription,
  editionPrice,
  formatMoney,
  primaryButtonClassName,
} from './shared'

type EditionRadioGroupModel = typeof EditionRadioGroupBlock.Model.Type

export const editionOptionView = (
  option: OptionInfo,
  h: ApplicationViewBuilder,
): Html => {
  const selectionBadgeClassName =
    'mt-2 inline-flex text-xs font-bold uppercase tracking-wider'

  return h.keyed('button')(
    option.value,
    [
      ...option.option,
      h.Class(
        clsx(
          'relative cursor-pointer border-2 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
          {
            'border-stone-900 bg-white': option.isSelected,
            'border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-white':
              !option.isSelected,
          },
        ),
      ),
    ],
    [
      h.div(
        [h.Class('flex items-start justify-between gap-4')],
        [
          h.div(
            [],
            [
              h.div(
                [...option.label, h.Class('text-sm font-bold text-stone-900')],
                [option.value],
              ),
              h.p(
                [
                  ...option.description,
                  h.Class('mt-1 text-xs leading-5 text-stone-600'),
                ],
                [editionDescription(option.value)],
              ),
            ],
          ),
          h.div(
            [h.Class('text-right')],
            [
              h.div(
                [h.Class('text-sm font-bold text-stone-900')],
                [formatMoney(editionPrice(option.value))],
              ),
              option.isSelected
                ? h.span(
                    [
                      h.Class(
                        clsx(
                          selectionBadgeClassName,
                          'items-center gap-1 text-orange-800',
                        ),
                      ),
                    ],
                    [Icon.check('h-3 w-3'), 'Selected'],
                  )
                : h.span(
                    [h.Class(clsx(selectionBadgeClassName, 'text-stone-600'))],
                    ['Choose'],
                  ),
            ],
          ),
        ],
      ),
    ],
  )
}

export const cancelCheckoutButton = (h: ApplicationViewBuilder): Html =>
  Button.view(
    {
      onClick: Message.ClickedCancel(),
      toView: attributes =>
        h.button(
          [...attributes.button, h.Class(cancelButtonClassName)],
          ['Cancel checkout'],
        ),
    },
    h,
  )

export const cartView = (
  state: CartState,
  editionRadioGroupModel: EditionRadioGroupModel,
  h: ApplicationViewBuilder,
): Html => {
  const continueLabel = state.isShippingRequired
    ? 'Continue to delivery'
    : 'Continue to payment'

  return h.div(
    [h.Class('grid gap-8')],
    [
      h.div(
        [
          h.Class(
            'grid gap-6 border-y border-stone-300 py-6 sm:grid-cols-4 sm:items-center',
          ),
        ],
        [
          bookCoverView('mx-auto sm:mx-0', false, h),
          h.div(
            [h.Class('sm:col-span-3')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-orange-800',
                  ),
                ],
                ['New release'],
              ),
              h.h2(
                [h.Class('mt-2 font-serif text-2xl text-stone-900')],
                ['Designing Durable Interfaces'],
              ),
              h.p([h.Class('mt-1 text-sm text-stone-600')], ['By Mira Chen']),
              h.p(
                [h.Class('mt-4 max-w-lg text-sm leading-6 text-stone-600')],
                [
                  'A practical field guide to state, feedback, and resilient interaction design.',
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-3')],
        [
          h.div(
            [h.Class('mb-3 text-sm font-bold text-stone-900')],
            ['Choose an edition'],
          ),
          h.block(
            EditionRadioGroupBinding.embedView({
              slotId: editionRadioGroupModel.id,
              model: editionRadioGroupModel,
              viewInputs: {
                selectedValue: Option.some(
                  editionName(state.isShippingRequired),
                ),
                options: EDITIONS,
                ariaLabel: 'Choose an edition',
                orientation: 'Horizontal',
                hasOptionDescription: () => true,
                toView: ({ group, options }) =>
                  h.div(
                    [...group, h.Class('grid gap-3 sm:grid-cols-2')],
                    Array.map(options, option => editionOptionView(option, h)),
                  ),
              },
            }),
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'flex flex-col gap-4 border-t border-stone-300 pt-6 sm:flex-row sm:items-center sm:justify-between',
          ),
        ],
        [
          cancelCheckoutButton(h),
          Button.view(
            {
              onClick: Message.ClickedContinue(),
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(primaryButtonClassName)],
                  [continueLabel, Icon.arrowRight()],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
}
