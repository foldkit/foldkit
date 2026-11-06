import { Option, String, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Issue } from '../../domain'
import { makeFieldsStep, makeStep } from './block'
import { CreateIssue } from './command'
import { CreateIssueComposition, DialogBinding } from './composition'
import { editIssueForm } from './draft'
import { CreateState } from './model'
import { OutMessage } from './outMessage'

const createIssue = makeStep(model => {
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

  const draft = Issue.Draft.make({
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

export const update = CreateIssueComposition.makeUpdate({
  UpdatedTitle: (model, { value }) =>
    editIssueForm(form => modifyFields(form, { title: () => value }))(model),
  UpdatedDescription: (model, { value }) =>
    editIssueForm(form => modifyFields(form, { description: () => value }))(
      model,
    ),
  SubmittedIssueForm: createIssue,
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
