import { Array, Crypto, Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import type { CalendarDate } from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import {
  EducationEntry,
  EducationEntryLive,
  educationEntryHasErrors,
  isEducationEntryComplete,
} from './educationEntry'

const Model = Schema.Struct({
  entries: Schema.Array(EducationEntry),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateEducationEntryId: { entryId: Schema.String },
  FailedGenerateEducationEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  RequestedRevealErrors: {},
})

export const GenerateEducationEntryId = Command.define(
  'GenerateEducationEntryId',
  {
    messages: [
      Message.SucceededGenerateEducationEntryId,
      Message.FailedGenerateEducationEntryId,
    ],
  },
)

type EducationArgs = Readonly<{
  today: CalendarDate
  initialEntryId: string
}>

export class Education extends Block<Education, EducationArgs>()('Education', {
  Model,
  Message,
  Command: [GenerateEducationEntryId],
}) {}

export const EducationLive = Education.make(
  Effect.fn(function* (_id, { today, initialEntryId }) {
    const crypto = yield* Crypto.Crypto
    const entry = yield* EducationEntry.each('entries', { today })

    return {
      model: { entries: [entry(initialEntryId)] },

      update: {
        ClickedAddEntry: model => ({
          model,
          commands: [GenerateEducationEntryId()],
        }),

        SucceededGenerateEducationEntryId: (model, { entryId }) => ({
          model: modifyFields(model, {
            entries: Array.append(entry(entryId)),
          }),
        }),

        FailedGenerateEducationEntryId: model => ({ model }),

        RemovedEntry: (model, { entryId }) => ({
          model: modifyFields(model, {
            entries: Array.filter(({ id }) => id !== entryId),
          }),
        }),

        RequestedRevealErrors: model => ({
          model,
          messages: Array.map(model.entries, educationEntry =>
            educationEntry.send(EducationEntry.Message.RequestedRevealErrors()),
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
        GenerateEducationEntryId: () =>
          crypto.randomUUIDv4.pipe(
            Effect.map(entryId =>
              Message.SucceededGenerateEducationEntryId({ entryId }),
            ),
            Effect.catch(() =>
              Effect.succeed(Message.FailedGenerateEducationEntryId()),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [h.Class('space-y-6')],
          [
            h.p(
              [h.Class('text-sm text-gray-500')],
              ['Add your educational background.'],
            ),
            h.div(
              [h.Class('divide-y divide-gray-200')],
              model.entries.map(educationEntry => educationEntry.view()),
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
                    ['+ Add Education'],
                  ),
              },
              h,
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(EducationEntryLive))

export const educationHasErrors = (model: Model): boolean =>
  Array.some(model.entries, entry => educationEntryHasErrors(entry.model))

export const isEducationComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, entry => isEducationEntryComplete(entry.model))
