// ✅ Returning results directly inside the existing Step.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const CreateState = defineTaggedUnion({ Idle: {}, Creating: {} })

const CreateIssueDefinition = Block.makeDefinition('CreateIssue', {
  Model: Schema.Struct({
    projectId: Schema.String,
    createState: CreateState,
  }),
  Message: Schema.Never,
})

const { makeStep } = CreateIssueDefinition

export const updateProjectStep = (projectId: string) =>
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
