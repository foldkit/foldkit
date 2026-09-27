import { Option } from 'effect'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'

import { Items } from '../domain'
import { Message } from '../message'
import { type Model, WriteError } from '../model'
import { footerView } from './footer'
import { itemsView } from './items'
import {
  addItemErrorView,
  newItemFormView,
  persistItemsErrorView,
} from './newItem'

const headerView = (h: HtmlBuilder<Message>): Html =>
  h.header(
    [h.Class('mb-6 text-center')],
    [
      h.h1(
        [h.Class('text-3xl font-bold text-gray-800')],
        ['TanStack DB + ElectricSQL'],
      ),
      h.p(
        [h.Class('mt-2 text-sm text-gray-500')],
        [
          'Persisted in Postgres and synced with ElectricSQL. Open this page in a second tab and watch changes appear in both.',
        ],
      ),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const { activeItemCount, completedItemCount } = Items.determineCounts(
    model.items,
  )

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
              Option.match(model.maybeWriteError, {
                onNone: () => h.empty,
                onSome: writeError =>
                  WriteError.match<Html>(writeError, {
                    AddItem: ({ error }) => addItemErrorView(error, h),
                    PersistItems: ({ error }) =>
                      persistItemsErrorView(error, h),
                  }),
              }),
              itemsView(model, h),
            ],
          ),
          footerView(model.filter, activeItemCount, completedItemCount, h),
        ],
      ),
    ],
  )

  return { title: 'TanStack DB + ElectricSQL', body }
}
