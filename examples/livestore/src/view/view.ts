import { Option } from 'effect'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'

import { Message } from '../message'
import type { Model } from '../model'
import { footerView } from './footer'
import { countItems, itemsView } from './items'
import { addItemErrorView, newItemFormView } from './newItem'

const headerView = (h: HtmlBuilder<Message>): Html =>
  h.header(
    [h.Class('mb-6 text-center')],
    [
      h.h1([h.Class('text-3xl font-bold text-gray-800')], ['LiveStore']),
      h.p(
        [h.Class('mt-2 text-sm text-gray-500')],
        [
          'Persisted locally with LiveStore. Open this page in a second tab and watch changes appear in both.',
        ],
      ),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const itemCount = countItems(model.items)
  const body = h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          headerView(h),
          h.main(
            [],
            [
              newItemFormView(model.newItemText, h),
              Option.match(model.maybeAddItemError, {
                onNone: () => h.empty,
                onSome: error => addItemErrorView(error, h),
              }),
              itemsView(model, h),
            ],
          ),
          footerView(model.filter, itemCount.active, itemCount.completed, h),
        ],
      ),
    ],
  )

  return { title: 'LiveStore', body }
}
