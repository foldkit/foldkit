import { Array, Crypto, Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import {
  SkillsEntry,
  SkillsEntryLive,
  isSkillsEntryComplete,
  skillsEntryHasErrors,
} from './skillsEntry'

const Model = Schema.Struct({
  entries: Schema.Array(SkillsEntry),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateSkillsEntryId: { entryId: Schema.String },
  FailedGenerateSkillsEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  RequestedRevealErrors: {},
})

export const GenerateSkillsEntryId = Command.define('GenerateSkillsEntryId', {
  messages: [
    Message.SucceededGenerateSkillsEntryId,
    Message.FailedGenerateSkillsEntryId,
  ],
})

type SkillsArgs = Readonly<{ initialEntryId: string }>

export class Skills extends Block<Skills, SkillsArgs>()('Skills', {
  Model,
  Message,
  Command: [GenerateSkillsEntryId],
}) {}

export const skillsHasErrors = (model: Model): boolean =>
  Array.some(model.entries, entry => skillsEntryHasErrors(entry.model))

export const isSkillsComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, entry => isSkillsEntryComplete(entry.model))

export const SkillsLive = Skills.make(
  Effect.fn(function* (_id, { initialEntryId }) {
    const crypto = yield* Crypto.Crypto
    const entry = yield* SkillsEntry.each('entries')

    return {
      model: { entries: [entry(initialEntryId)] },

      update: {
        ClickedAddEntry: model => ({
          model,
          commands: [GenerateSkillsEntryId()],
        }),

        SucceededGenerateSkillsEntryId: (model, { entryId }) => ({
          model: modifyFields(model, {
            entries: Array.append(entry(entryId)),
          }),
        }),

        FailedGenerateSkillsEntryId: model => ({ model }),

        RemovedEntry: (model, { entryId }) => ({
          model: modifyFields(model, {
            entries: Array.filter(({ id }) => id !== entryId),
          }),
        }),

        RequestedRevealErrors: model => ({
          model,
          messages: Array.map(model.entries, skillsEntry =>
            skillsEntry.send(SkillsEntry.Message.RequestedRevealErrors()),
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
        GenerateSkillsEntryId: () =>
          crypto.randomUUIDv4.pipe(
            Effect.map(entryId =>
              Message.SucceededGenerateSkillsEntryId({ entryId }),
            ),
            Effect.catch(() =>
              Effect.succeed(Message.FailedGenerateSkillsEntryId()),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [h.Class('space-y-6')],
          [
            h.p(
              [h.Class('text-sm text-gray-500')],
              ['Add your technical and professional skills.'],
            ),
            h.div(
              [h.Class('divide-y divide-gray-200')],
              model.entries.map(skillsEntry => skillsEntry.view()),
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
                    ['+ Add Skill'],
                  ),
              },
              h,
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(SkillsEntryLive))
