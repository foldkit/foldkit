import { Effect, Match, Option } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  CheckoutState,
  type Discount,
  editionName,
  formatMoney,
  orderPricing,
  promoToMaybeDiscount,
} from './domain/checkout'
import * as Icon from './domain/icon'
import { bookCoverView } from './domain/view'

type ViewInput = Readonly<{ state: CheckoutState }>

export class OrderSummary extends Block<OrderSummary, void, ViewInput>()(
  'OrderSummary',
  {},
) {}

type OrderSummaryViewBuilder = HtmlBuilder<never>

const stateToMaybeDiscount = (state: CheckoutState): Option.Option<Discount> =>
  Match.value(state).pipe(
    Match.tags({
      Review: reviewState => promoToMaybeDiscount(reviewState.promo),
      Placing: placingState => placingState.maybeDiscount,
      Confirmed: confirmedState => confirmedState.maybeDiscount,
    }),
    Match.option,
    Option.flatten,
  )

const orderSummaryView = (
  state: CheckoutState,
  h: OrderSummaryViewBuilder,
): Html => {
  const pricing = orderPricing(
    state.isShippingRequired,
    stateToMaybeDiscount(state),
  )
  const summaryRowClassName = 'flex items-center justify-between gap-4'
  const orderNoteClassName =
    'mt-5 flex items-start gap-2 text-xs leading-5 text-stone-600'

  return h.aside(
    [
      h.AriaLabel('Order summary'),
      h.Class(
        'h-fit border border-stone-300 bg-stone-200 p-5 lg:sticky lg:top-6 sm:p-6',
      ),
    ],
    [
      h.h2(
        [h.Class('text-sm font-bold uppercase tracking-widest text-stone-900')],
        ['Order summary'],
      ),
      h.div(
        [h.Class('mt-5 grid grid-cols-4 gap-4 border-b border-stone-300 pb-5')],
        [
          bookCoverView('', true, h),
          h.div(
            [h.Class('col-span-3')],
            [
              h.div(
                [h.Class('font-serif text-base leading-5 text-stone-900')],
                ['Designing Durable Interfaces'],
              ),
              h.div(
                [h.Class('mt-2 text-xs text-stone-600')],
                [`${editionName(state.isShippingRequired)} · Qty 1`],
              ),
              h.div(
                [h.Class('mt-3 text-sm font-bold text-stone-900')],
                [formatMoney(pricing.subtotal)],
              ),
            ],
          ),
        ],
      ),
      h.dl(
        [h.Class('grid gap-3 border-b border-stone-300 py-5 text-sm')],
        [
          h.div(
            [h.Class(summaryRowClassName)],
            [
              h.dt([h.Class('text-stone-600')], ['Subtotal']),
              h.dd(
                [h.Class('font-medium text-stone-900')],
                [formatMoney(pricing.subtotal)],
              ),
            ],
          ),
          ...Option.match(pricing.maybeAppliedDiscount, {
            onNone: () => [],
            onSome: appliedDiscount => [
              h.div(
                [h.Class(summaryRowClassName)],
                [
                  h.dt(
                    [h.Class('text-stone-600')],
                    [`Discount · ${appliedDiscount.code}`],
                  ),
                  h.dd(
                    [h.Class('font-medium text-orange-800')],
                    [`-${formatMoney(appliedDiscount.amount)}`],
                  ),
                ],
              ),
            ],
          }),
          h.div(
            [h.Class(summaryRowClassName)],
            [
              h.dt(
                [h.Class('text-stone-600')],
                [state.isShippingRequired ? 'Shipping' : 'Email delivery'],
              ),
              h.dd([h.Class('font-medium text-stone-900')], ['Free']),
            ],
          ),
          h.div(
            [h.Class(summaryRowClassName)],
            [
              h.dt([h.Class('text-stone-600')], ['Estimated tax']),
              h.dd(
                [h.Class('font-medium text-stone-900')],
                [formatMoney(pricing.tax)],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex items-baseline justify-between gap-4 pt-5')],
        [
          h.div([h.Class('text-sm font-bold text-stone-900')], ['Total']),
          h.div(
            [h.Class('font-serif text-2xl text-stone-900')],
            [formatMoney(pricing.total)],
          ),
        ],
      ),
      state.isShippingRequired
        ? h.div(
            [h.Class(orderNoteClassName)],
            [
              Icon.truck('mt-0.5 h-4 w-4 shrink-0'),
              'Free tracked shipping in the United States.',
            ],
          )
        : h.div(
            [h.Class(orderNoteClassName)],
            [
              Icon.download('mt-0.5 h-4 w-4 shrink-0'),
              'Download links arrive immediately after purchase.',
            ],
          ),
    ],
  )
}

export const OrderSummaryLive = OrderSummary.make(
  Effect.fn(function* () {
    return {
      view: (_model, h, { state }) => orderSummaryView(state, h),
    }
  }),
)
