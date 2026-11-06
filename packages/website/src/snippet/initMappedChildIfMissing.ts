import { makeInitIfMissingStep } from 'foldkit/bindingInit'

import { EditorsBinding } from './composition'
import { Issue } from './domain'

const initIssueEditorIfMissing = (issue: Issue) =>
  makeInitIfMissingStep(EditorsBinding, {
    key: issue.id,
    args: [issue],
  })
