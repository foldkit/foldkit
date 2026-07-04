import { m } from 'foldkit/message'

// ❌ Bad
// A present-tense name reads as an imperative command, not a fact that happened.
const SubmitForm = m('SubmitForm')

// ✅ Good
// Name the Message for the event that happened, verb-first and past-tense.
const SubmittedForm = m('SubmittedForm')
