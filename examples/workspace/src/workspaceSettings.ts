import { Effect, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

import { WorkspaceRepository } from './services'

const Message = defineMessageUnion({
  ClickedSimulateActivity: {},
  ClickedSimulateSaveFailure: {},
  CompletedSimulateSaveFailure: {},
})

const OutMessage = defineMessageUnion({
  RequestedActivity: {},
  ScheduledSaveFailure: {},
})

export const SimulateSaveFailure = Command.define('SimulateSaveFailure', {
  messages: [Message.CompletedSimulateSaveFailure],
})

const ViewInput = Schema.Struct({
  maybeNotice: Schema.Option(Schema.String),
  maybeActivityError: Schema.Option(Schema.String),
  activityTick: Schema.Number,
})
type ViewInput = typeof ViewInput.Type

export class WorkspaceSettings extends Block<
  WorkspaceSettings,
  void,
  ViewInput
>()('WorkspaceSettings', {
  Message,
  OutMessage,
  Command: [SimulateSaveFailure],
}) {}

export const WorkspaceSettingsLive = WorkspaceSettings.make(
  Effect.fn(function* () {
    const repository = yield* WorkspaceRepository

    return {
      update: {
        ClickedSimulateActivity: model => ({
          model,
          outMessage: OutMessage.RequestedActivity(),
        }),
        ClickedSimulateSaveFailure: model => ({
          model,
          commands: [SimulateSaveFailure()],
        }),
        CompletedSimulateSaveFailure: model => ({
          model,
          outMessage: OutMessage.ScheduledSaveFailure(),
        }),
      },

      commands: {
        SimulateSaveFailure: () =>
          repository
            .failNext('Save')
            .pipe(Effect.as(Message.CompletedSimulateSaveFailure())),
      },

      view: (_model, h, { maybeNotice, maybeActivityError, activityTick }) =>
        h.section(
          [h.Class('max-w-2xl space-y-6 p-5')],
          [
            h.div(
              [h.Class('space-y-2')],
              [
                h.h2(
                  [h.Class('text-base font-semibold text-slate-800')],
                  ['Demo controls'],
                ),
                h.p(
                  [h.Class('text-sm leading-6 text-slate-600')],
                  [
                    'Changes last for this session. Reloading restores the sample workspace.',
                  ],
                ),
                Option.match(maybeNotice, {
                  onNone: () => h.empty,
                  onSome: notice =>
                    h.p(
                      [h.Class('text-sm leading-6 text-slate-600')],
                      [notice],
                    ),
                }),
              ],
            ),
            h.div(
              [h.Class('border-t border-slate-200 pt-5')],
              [
                h.h3(
                  [h.Class('mb-2 text-base font-semibold text-slate-800')],
                  ['Live activity'],
                ),
                h.p(
                  [h.Class('mb-4 text-sm leading-6 text-slate-600')],
                  [
                    'Teammate activity arrives every 20 seconds. Comments and assignments appear in Notifications.',
                  ],
                ),
                Option.match(maybeActivityError, {
                  onNone: () => h.empty,
                  onSome: error =>
                    h.p(
                      [h.Role('alert'), h.Class('mb-4 text-sm text-rose-700')],
                      [error],
                    ),
                }),
                h.div(
                  [h.Class('flex flex-wrap items-center gap-4')],
                  [
                    Button.view(
                      {
                        type: 'button',
                        onClick: Message.ClickedSimulateActivity(),
                        toView: attributes =>
                          h.button(
                            [...attributes.button, h.Class('button')],
                            ['Simulate activity'],
                          ),
                      },
                      h,
                    ),
                    h.p(
                      [h.Class('text-[13px] text-slate-600')],
                      [`${activityTick} activity events requested`],
                    ),
                  ],
                ),
              ],
            ),
            h.div(
              [h.Class('border-t border-slate-200 pt-5')],
              [
                h.h3(
                  [h.Class('mb-2 text-base font-semibold text-slate-800')],
                  ['Save recovery'],
                ),
                h.p(
                  [h.Class('mb-4 text-sm leading-6 text-slate-600')],
                  [
                    'Fail the next issue save to test recovery. The editor keeps your draft for retry.',
                  ],
                ),
                Button.view(
                  {
                    type: 'button',
                    onClick: Message.ClickedSimulateSaveFailure(),
                    toView: attributes =>
                      h.button(
                        [...attributes.button, h.Class('button')],
                        ['Fail next save'],
                      ),
                  },
                  h,
                ),
              ],
            ),
          ],
        ),
    }
  }),
)
