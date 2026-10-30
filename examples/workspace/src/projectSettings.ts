import { Effect, Schema, String } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Fieldset, Input, Textarea } from '@foldkit/ui'

import { Project } from './domain/domain'
import { protectUnsavedChanges } from './domain/draftProtection'
import { WorkspaceRepository } from './services'

export const Message = defineMessageUnion({
  UpdatedProjectName: { value: Schema.String },
  UpdatedProjectDescription: { value: Schema.String },
  SubmittedProjectSettings: {},
  ClickedRetrySave: {},
  ClickedDiscardChanges: {},
  SucceededSaveProject: { project: Project },
  FailedSaveProject: { error: Schema.String },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Saved: { project: Project },
})
export type OutMessage = typeof OutMessage.Type

const ProjectDraft = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
})
type ProjectDraft = typeof ProjectDraft.Type

export const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: {},
  Saved: {},
  Failed: { error: Schema.String },
})
export type SaveState = typeof SaveState.Type

export const Model = Schema.Struct({
  baseline: Project,
  draft: ProjectDraft,
  saveState: SaveState,
})
export type Model = typeof Model.Type

export const SaveProject = Command.define('SaveProject', {
  args: { project: Project },
  messages: [Message.SucceededSaveProject, Message.FailedSaveProject],
})

type ProjectSettingsArgs = Readonly<{ project: Project }>

export class ProjectSettings extends Block<
  ProjectSettings,
  ProjectSettingsArgs
>()('ProjectSettings', {
  Model,
  Message,
  OutMessage,
  Command: [SaveProject],
}) {}

const isDirty = (model: Model) =>
  String.trim(model.draft.name) !== model.baseline.name ||
  model.draft.description !== model.baseline.description

const editDraftStep =
  (transformDraft: (draft: ProjectDraft) => ProjectDraft) => (model: Model) => {
    if (SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        draft: transformDraft,
        saveState: () => SaveState.Idle(),
      }),
    }
  }

const saveProject = (model: Model) => {
  const name = String.trim(model.draft.name)

  if (
    SaveState.guards.Saving(model.saveState) ||
    String.isEmpty(name) ||
    !isDirty(model)
  ) {
    return { model }
  }

  return {
    model: modifyFields(model, { saveState: () => SaveState.Saving() }),
    commands: [
      SaveProject({
        project: modifyFields(model.baseline, {
          name: () => name,
          description: () => model.draft.description,
        }),
      }),
    ],
  }
}

const handleClickedDiscardChanges = (model: Model) => {
  if (SaveState.guards.Saving(model.saveState)) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      draft: () => ({
        name: model.baseline.name,
        description: model.baseline.description,
      }),
      saveState: () => SaveState.Idle(),
    }),
  }
}

const saveFeedback = (model: Model, h: HtmlBuilder<Message, unknown>): Html =>
  SaveState.match(model.saveState, {
    Idle: () => h.empty,
    Saving: () =>
      h.p([h.Role('status'), h.Class('sr-only')], ['Saving project…']),
    Saved: () =>
      h.p(
        [h.Role('status'), h.Class('mb-5 text-sm text-emerald-700')],
        ['Project saved'],
      ),
    Failed: ({ error }) =>
      h.div(
        [
          h.Role('alert'),
          h.Class(
            'mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700',
          ),
        ],
        [
          h.p([], [error]),
          Button.view(
            {
              type: 'button',
              onClick: Message.ClickedRetrySave(),
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class('button')],
                  ['Retry changes'],
                ),
            },
            h,
          ),
        ],
      ),
  })

const projectNameField = (
  model: Model,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  Input.view(
    {
      id: 'workspace-project-name',
      value: model.draft.name,
      isDisabled: SaveState.guards.Saving(model.saveState),
      onInput: value => Message.UpdatedProjectName({ value }),
      toView: attributes =>
        h.div(
          [h.Class('space-y-2')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('block text-[13px] font-medium text-slate-600'),
              ],
              ['Project name'],
            ),
            h.input([
              ...attributes.input,
              h.Required(true),
              h.AriaRequired(true),
              h.Pattern('.*\\S.*'),
              h.Class('input-control'),
            ]),
          ],
        ),
    },
    h,
  )

const projectDescriptionField = (
  model: Model,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  Textarea.view(
    {
      id: 'workspace-project-description',
      value: model.draft.description,
      isDisabled: SaveState.guards.Saving(model.saveState),
      rows: 4,
      onInput: value => Message.UpdatedProjectDescription({ value }),
      toView: attributes =>
        h.div(
          [h.Class('space-y-2')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('block text-[13px] font-medium text-slate-600'),
              ],
              ['Project description'],
            ),
            h.textarea([
              ...attributes.textarea,
              h.Class(
                'text-control min-h-11 resize-y px-3 py-2 text-sm leading-6',
              ),
            ]),
          ],
        ),
    },
    h,
  )

const formActions = (model: Model, h: HtmlBuilder<Message, unknown>): Html => {
  const isSaving = SaveState.guards.Saving(model.saveState)
  const isChanged = isDirty(model)
  const isValid = String.isNonEmpty(String.trim(model.draft.name))

  return h.div(
    [
      h.Class(
        'flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5',
      ),
    ],
    [
      Button.view(
        {
          type: 'button',
          isDisabled: isSaving || !isChanged,
          onClick: Message.ClickedDiscardChanges(),
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class('button')],
              ['Discard changes'],
            ),
        },
        h,
      ),
      Button.view(
        {
          type: 'submit',
          isDisabled: isSaving || !isValid || !isChanged,
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class('button-primary')],
              [isSaving ? 'Saving…' : 'Save changes'],
            ),
        },
        h,
      ),
    ],
  )
}

export const ProjectSettingsLive = ProjectSettings.make(
  Effect.fn(function* (_id, { project }) {
    const repository = yield* WorkspaceRepository

    return {
      model: {
        baseline: project,
        draft: { name: project.name, description: project.description },
        saveState: SaveState.Idle(),
      },
      update: {
        UpdatedProjectName: (model, { value }) =>
          editDraftStep(draft => modifyFields(draft, { name: () => value }))(
            model,
          ),
        UpdatedProjectDescription: (model, { value }) =>
          editDraftStep(draft =>
            modifyFields(draft, { description: () => value }),
          )(model),
        SubmittedProjectSettings: saveProject,
        ClickedRetrySave: saveProject,
        ClickedDiscardChanges: handleClickedDiscardChanges,
        SucceededSaveProject: (model, { project }) => {
          if (
            !SaveState.guards.Saving(model.saveState) ||
            project.id !== model.baseline.id
          ) {
            return { model }
          }

          return {
            model: modifyFields(model, {
              baseline: () => project,
              draft: () => ({
                name: project.name,
                description: project.description,
              }),
              saveState: () => SaveState.Saved(),
            }),
            outMessage: OutMessage.Saved({ project }),
          }
        },
        FailedSaveProject: (model, { error }) => {
          if (!SaveState.guards.Saving(model.saveState)) {
            return { model }
          }

          return {
            model: modifyFields(model, {
              saveState: () => SaveState.Failed({ error }),
            }),
          }
        },
      },
      commands: {
        SaveProject: ({ project }) =>
          repository.saveProject(project).pipe(
            Effect.map(project => Message.SucceededSaveProject({ project })),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedSaveProject({ error: error.message }),
              ),
            ),
          ),
      },
      subscriptions: {
        draftExitGuard: {
          dependencies: isDirty,
          stream: (isProtecting: boolean) =>
            protectUnsavedChanges({ isProtecting }),
        },
      },
      view: (model, h) =>
        h.section(
          [h.Class('max-w-2xl p-5 lg:p-8')],
          [
            h.form(
              [
                h.OnSubmit(Message.SubmittedProjectSettings()),
                h.Class('rounded-xl border border-slate-200 bg-white p-6'),
              ],
              [
                h.h2(
                  [h.Class('mb-5 text-base font-semibold text-slate-800')],
                  ['Project details'],
                ),
                saveFeedback(model, h),
                Fieldset.view(
                  {
                    id: 'workspace-project-fields',
                    isDisabled: SaveState.guards.Saving(model.saveState),
                    toView: attributes =>
                      h.fieldset(
                        [...attributes.fieldset, h.Class('space-y-5')],
                        [
                          h.legend(
                            [...attributes.legend, h.Class('sr-only')],
                            ['Project settings'],
                          ),
                          projectNameField(model, h),
                          projectDescriptionField(model, h),
                          formActions(model, h),
                        ],
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
