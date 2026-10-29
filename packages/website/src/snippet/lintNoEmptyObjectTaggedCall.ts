import { defineTaggedUnion } from 'foldkit/schema'

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
})
type Submission = typeof Submission.Type
// ❌ Bad
const badSubmission = Submission.NotSubmitted({})

// ✅ Good
const goodSubmission = Submission.NotSubmitted()
