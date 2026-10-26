import { CreateIssueComposition } from './composition'
import { CreateState } from './definition'

export const init = CreateIssueComposition.makeInit(() => ({
  model: {
    title: '',
    description: '',
    projectId: 'platform',
    status: 'Todo',
    priority: 'Medium',
    createState: CreateState.Idle(),
  },
}))
