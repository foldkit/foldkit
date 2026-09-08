import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const Message = defineMessageUnion({
  ClickedSave: {},
})

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
})

const Library = {
  Configure: (_config: object) => undefined,
}

const goodMessage = Message.ClickedSave()
const goodSubmission = Submission.NotSubmitted()
const config = Library.Configure({})

export const localUnion = (
  defineTaggedUnion: (cases: unknown) => {
    Empty: (fields: object) => object
  },
) => {
  const LocalUnion = defineTaggedUnion({ Empty: {} })

  return LocalUnion.Empty({})
}

export const localMessage = (
  Message: Readonly<{ ClickedSave: (fields: object) => object }>,
) => Message.ClickedSave({})
