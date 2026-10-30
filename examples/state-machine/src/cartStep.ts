import { clsx } from 'clsx'
import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'
import * as RadioGroup from '@foldkit/ui/radioGroup'
import type { OptionInfo } from '@foldkit/ui/radioGroup'

import {
  type CartState,
  DIGITAL_PRICE,
  EBOOK_EDITION,
  HARDCOVER_EDITION,
  PHYSICAL_PRICE,
  editionName,
  formatMoney,
} from './domain/checkout'
import * as Icon from './domain/icon'
import {
  bookCoverView,
  cancelCheckoutButtonView,
  primaryButtonClassName,
} from './domain/view'

const EDITION_RADIO_GROUP_ID = 'edition'

const EDITIONS: ReadonlyArray<string> = [HARDCOVER_EDITION, EBOOK_EDITION]

export const EditionRadioGroup = RadioGroup.makeBlock()

const Model = Schema.Struct({
  editionRadioGroup: EditionRadioGroup,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedCancel: {},
  ClickedContinue: {},
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  RequestedCancel: {},
  RequestedContinue: {},
  SelectedEdition: { isShippingRequired: Schema.Boolean },
})

type ViewInput = Readonly<{ state: CartState }>

export class CartStep extends Block<CartStep, void, ViewInput>()('CartStep', {
  Model,
  Message,
  OutMessage,
}) {}

type CartStepViewBuilder = HtmlBuilder<Message>

const editionPrice = (edition: string): number =>
  edition === 'Hardcover' ? PHYSICAL_PRICE : DIGITAL_PRICE

const editionDescription = (edition: string): string =>
  edition === 'Hardcover'
    ? 'Clothbound, 248 pages. Ships in 1–2 business days.'
    : 'PDF and EPUB files delivered by email after purchase.'

const editionOptionView = (
  option: OptionInfo,
  h: CartStepViewBuilder,
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

const cartView = (
  state: CartState,
  editionRadioGroup: Model['editionRadioGroup'],
  h: CartStepViewBuilder,
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
          editionRadioGroup.view({
            selectedValue: Option.some(editionName(state.isShippingRequired)),
            options: EDITIONS,
            ariaLabel: 'Choose an edition',
            orientation: 'Horizontal',
            hasOptionDescription: () => true,
            toView: ({ group, options }) =>
              h.div(
                [...group, h.Class('grid gap-3 sm:grid-cols-2')],
                Array.map(options, option => editionOptionView(option, h)),
              ),
          }),
        ],
      ),
      h.div(
        [
          h.Class(
            'flex flex-col gap-4 border-t border-stone-300 pt-6 sm:flex-row sm:items-center sm:justify-between',
          ),
        ],
        [
          cancelCheckoutButtonView(Message.ClickedCancel(), h),
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

export const CartStepLive = CartStep.make(
  Effect.fn(function* () {
    const editionRadioGroup = yield* new EditionRadioGroup(
      'editionRadioGroup',
      { id: EDITION_RADIO_GROUP_ID },
    )

    return {
      model: { editionRadioGroup },

      update: {
        ClickedCancel: model => ({
          model,
          outMessage: OutMessage.RequestedCancel(),
        }),
        ClickedContinue: model => ({
          model,
          outMessage: OutMessage.RequestedContinue(),
        }),
        ...editionRadioGroup.on({
          Selected: (model, { value }) => ({
            model,
            outMessage: OutMessage.SelectedEdition({
              isShippingRequired: value === HARDCOVER_EDITION,
            }),
          }),
        }),
      },

      view: (model, h, { state }) =>
        cartView(state, model.editionRadioGroup, h),
    }
  }),
).pipe(Layer.provide(EditionRadioGroup.Live))
