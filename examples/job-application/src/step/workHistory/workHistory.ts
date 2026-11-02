import { Array, Crypto, Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import {
  type CalendarDate,
  CalendarDate as CalendarDateSchema,
} from 'foldkit/calendar'
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
  today: CalendarDateSchema,
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

export const WorkHistoryLive = WorkHistory.toLayer(
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto

    return {
      init: ({ today, initialEntryId }) => ({
        today,
        entries: [new WorkHistoryEntry(initialEntryId, { today })],
      }),

      update: {
        ClickedAddEntry: model => ({
          model,
          commands: [GenerateWorkHistoryEntryId()],
        }),

        SucceededGenerateWorkHistoryEntryId: (model, { entryId }) => ({
          model: modifyFields(model, {
            entries: Array.append(
              new WorkHistoryEntry(entryId, { today: model.today }),
            ),
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

        ...WorkHistoryEntry.on({
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

export const workHistoryHasErrors = (model: Model): boolean =>
  Array.some(model.entries, entry => workHistoryEntryHasErrors(entry.model))

export const isWorkHistoryComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, entry => isWorkHistoryEntryComplete(entry.model))
