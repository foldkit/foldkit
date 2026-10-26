// ❌ Constructing and immediately applying local Steps inside a Step.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'

const CreateState = defineTaggedUnion({ Idle: {}, Creating: {} })

const CreateIssueDefinition = Block.makeDefinition('CreateIssue', {
  Model: Schema.Struct({
    projectId: Schema.String,
    createState: CreateState,
  }),
  Message: Schema.Never,
})

export const updateProjectStep = (projectId: string) =>
  CreateIssueDefinition.makeStep(model => {
    if (model.createState._tag === 'Creating') {
      return CreateIssueDefinition.makeNoopStep()(model)
    }

    return CreateIssueDefinition.makeFieldsStep(() => ({
      projectId: () => projectId,
    }))(model)
  })
