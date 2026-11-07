// ✅ Returning results directly inside the existing Step.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const CreateState = defineTaggedUnion({ Idle: {}, Creating: {} })
type CreateState = typeof CreateState.Type

export const CreateIssueKey = Symbol('CreateIssue')
const CreateIssueBlock = Block.make('CreateIssue', {
  key: CreateIssueKey,
  InitArgs: Schema.Tuple([]),
  isMessageFree: true,

  Model: Schema.Struct({
    projectId: Schema.String,
    createState: CreateState,
  }),
  Message: Schema.Never,
})

const { makeStep } = CreateIssueBlock

export const updateProject = (projectId: string) =>
  makeStep(model => {
    if (model.createState._tag === 'Creating') {
      return { model }
    }

    return {
      model: modifyFields(model, {
        projectId: () => projectId,
      }),
    }
  })
