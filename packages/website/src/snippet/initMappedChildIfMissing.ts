import { makeInitIfMissingStep } from 'foldkit/binding'

import { EditorsBinding } from './composition'
import { Issue } from './domain'

const initIssueEditorIfMissing = (issue: Issue) =>
  makeInitIfMissingStep(EditorsBinding, {
    key: issue.id,
    args: [issue],
  })
