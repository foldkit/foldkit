import { CreateIssueComposition } from './composition'
import { CreateState } from './model'

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
