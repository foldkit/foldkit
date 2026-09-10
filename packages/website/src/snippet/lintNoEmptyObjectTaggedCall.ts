import { defineTaggedUnion } from 'foldkit/schema'

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
})

// ❌ Bad
const badSubmission = Submission.NotSubmitted({})

// ✅ Good
const goodSubmission = Submission.NotSubmitted()
