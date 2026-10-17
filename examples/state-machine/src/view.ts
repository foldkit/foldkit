import { ApplicationComposition } from './composition'
import { analysisView } from './view/analysis'
import { checkoutPanelView, orderSummaryView } from './view/checkout'
import { pageHeaderView, progressView } from './view/header'
import { stateTitle } from './view/shared'

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `${stateTitle(model.checkout)} | Signal Press`,
  body: h.div(
    [h.Class('min-h-screen bg-stone-100 text-stone-900')],
    [
      pageHeaderView(h),
      h.main(
        [
          h.Class(
            'mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8',
          ),
        ],
        [
          analysisView(model, h),
          progressView(model.checkout, h),
          h.div(
            [h.Class('mt-6 grid gap-6 sm:mt-8 lg:grid-cols-3 lg:items-start')],
            [
              checkoutPanelView(model.checkout, model.editionRadioGroup, h),
              orderSummaryView(model.checkout, h),
            ],
          ),
        ],
      ),
      h.footer(
        [h.Class('border-t border-stone-300 bg-stone-50')],
        [
          h.div(
            [
              h.Class(
                'mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-stone-600 sm:flex-row sm:items-center sm:justify-between sm:px-8',
              ),
            ],
            [
              h.div([], ['© Signal Press · Brooklyn, New York']),
              h.div([], ['Questions? support@signalpress.example']),
            ],
          ),
        ],
      ),
    ],
  ),
}))
