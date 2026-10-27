import { Option, String, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { IssueDraft } from '../domain'
import { CreateIssue } from './command'
import { CreateIssueComposition, DialogBinding } from './composition'
import { makeFieldsStep, makeStep } from './definition'
import { editDraftStep } from './draft'
import { Message } from './message'
import { CreateState, type Model } from './model'
import { OutMessage } from './outMessage'

const createIssueStep = makeStep(model => {
  if (CreateState.guards.Creating(model.createState)) {
    return { model }
  }

  const title = String.trim(model.title)

  if (String.isEmpty(title)) {
    return {
      model: modifyFields(model, {
        createState: () =>
          CreateState.Failed({
            error: 'Enter an issue title before creating it.',
          }),
      }),
    }
  }

  const draft = IssueDraft.make({
    title,
    description: model.description,
    projectId: model.projectId,
    status: model.status,
    priority: model.priority,
    maybeAssigneeId: Option.none(),
    labelIds: [],
  })

  return {
    model: modifyFields(model, {
      createState: () => CreateState.Creating(),
    }),
    commands: [CreateIssue({ draft })],
  }
})

const handleUpdatedDescription = (
  model: typeof Model.Type,
  { value }: typeof Message.UpdatedDescription.Type,
) =>
  editDraftStep(draft => modifyFields(draft, { description: () => value }))(
    model,
  )

export const update = CreateIssueComposition.makeUpdate({
  RequestedOpen: (model, { projectId, status = 'Todo' }) => {
    if (CreateState.guards.Creating(model.createState)) {
      return DialogBinding.requestOpen()(model)
    }

    return Update.combineSteps(model, [
      makeFieldsStep(() => ({
        title: () => '',
        description: () => '',
        projectId: () => projectId,
        status: () => status,
        priority: () => 'Medium',
        createState: () => CreateState.Idle(),
      })),
      DialogBinding.requestOpen(),
    ])
  },
  RequestedClose: DialogBinding.requestClose(),
  UpdatedTitle: (model, { value }) =>
    editDraftStep(draftModel =>
      modifyFields(draftModel, { title: () => value }),
    )(model),
  UpdatedDescription: handleUpdatedDescription,
  SubmittedIssueForm: createIssueStep,
  SucceededCreateIssue: (model, { issue }) => {
    return pipe(
      Update.combineSteps(model, [
        makeFieldsStep(() => ({
          createState: () => CreateState.Idle(),
        })),
        DialogBinding.requestClose(),
      ]),
      Update.withOutMessage(OutMessage.Created({ issue })),
    )
  },
  FailedCreateIssue: (model, { error }) =>
    Update.combineSteps(model, [
      makeFieldsStep(() => ({
        createState: () => CreateState.Failed({ error }),
      })),
      DialogBinding.requestOpen(),
    ]),
})
