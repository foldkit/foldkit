import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const Message = defineMessageUnion({
  Root: {},
})

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
})

const badSubmission = Submission.NotSubmitted({})

const local = () => {
  const Message = defineMessageUnion({
    Local: {},
  })

  return Message.Local({})
}

const badRootAfterLocal = Message.Root({})
