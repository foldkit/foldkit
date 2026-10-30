import { Array, Crypto, Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import type { CalendarDate } from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import {
  WorkHistoryEntry,
  WorkHistoryEntryLive,
  isWorkHistoryEntryComplete,
  workHistoryEntryHasErrors,
} from './workHistoryEntry'

const Model = Schema.Struct({
  entries: Schema.Array(WorkHistoryEntry),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateWorkHistoryEntryId: { entryId: Schema.String },
  FailedGenerateWorkHistoryEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  RequestedRevealErrors: {},
})

export const GenerateWorkHistoryEntryId = Command.define(
  'GenerateWorkHistoryEntryId',
  {
    messages: [
      Message.SucceededGenerateWorkHistoryEntryId,
      Message.FailedGenerateWorkHistoryEntryId,
    ],
  },
)

type WorkHistoryArgs = Readonly<{
  today: CalendarDate
  initialEntryId: string
}>

export class WorkHistory extends Block<WorkHistory, WorkHistoryArgs>()(
  'WorkHistory',
  {
    Model,
    Message,
    Command: [GenerateWorkHistoryEntryId],
  },
) {}

export const workHistoryHasErrors = (model: Model): boolean =>
  Array.some(model.entries, entry => workHistoryEntryHasErrors(entry.model))

export const isWorkHistoryComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, entry => isWorkHistoryEntryComplete(entry.model))

export const WorkHistoryLive = WorkHistory.make(
  Effect.fn(function* (_id, { today, initialEntryId }) {
    const crypto = yield* Crypto.Crypto
    const entry = yield* WorkHistoryEntry.each('entries', { today })

    return {
      model: { entries: [entry(initialEntryId)] },

      update: {
        ClickedAddEntry: model => ({
          model,
          commands: [GenerateWorkHistoryEntryId()],
        }),

        SucceededGenerateWorkHistoryEntryId: (model, { entryId }) => ({
          model: modifyFields(model, {
            entries: Array.append(entry(entryId)),
          }),
        }),

        FailedGenerateWorkHistoryEntryId: model => ({ model }),

        RemovedEntry: (model, { entryId }) => ({
          model: modifyFields(model, {
            entries: Array.filter(({ id }) => id !== entryId),
          }),
        }),

        RequestedRevealErrors: model => ({
          model,
          messages: Array.map(model.entries, workHistoryEntry =>
            workHistoryEntry.send(
              WorkHistoryEntry.Message.RequestedRevealErrors(),
            ),
          ),
        }),

        ...entry.on({
          Removed: (model, _, removed) => ({
            model: modifyFields(model, {
              entries: Array.filter(({ id }) => id !== removed.id),
            }),
          }),
        }),
      },

      commands: {
        GenerateWorkHistoryEntryId: () =>
          crypto.randomUUIDv4.pipe(
            Effect.map(entryId =>
              Message.SucceededGenerateWorkHistoryEntryId({ entryId }),
            ),
            Effect.catch(() =>
              Effect.succeed(Message.FailedGenerateWorkHistoryEntryId()),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [h.Class('space-y-6')],
          [
            h.p(
              [h.Class('text-sm text-gray-500')],
              [
                'Add your relevant work experience, starting with the most recent.',
              ],
            ),
            h.div(
              [h.Class('divide-y divide-gray-200')],
              model.entries.map(workHistoryEntry => workHistoryEntry.view()),
            ),
            Button.view(
              {
                onClick: Message.ClickedAddEntry(),
                toView: attributes =>
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
                      ),
                    ],
                    ['+ Add Position'],
                  ),
              },
              h,
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(WorkHistoryEntryLive))
