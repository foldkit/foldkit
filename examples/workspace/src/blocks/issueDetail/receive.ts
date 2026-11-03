import { IssueDetailComposition } from './composition'
import { reconcileIssue } from './draft'
import type { InformedOfIssueChange } from './inMessage'
import type { Model } from './model'
import { saveIssue } from './steps'

const handleInformedOfIssueChange = (
  model: Model,
  { issue }: InformedOfIssueChange,
) => ({ model: reconcileIssue(model, issue) })

export const receive = IssueDetailComposition.makeReceive({
  RequestedSave: saveIssue,
  InformedOfIssueChange: handleInformedOfIssueChange,
})
