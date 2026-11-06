import { defineMessageUnion } from 'foldkit/message'

import { Project } from '../../domain'

export const OutMessage = defineMessageUnion({
  Saved: { project: Project.Project },
})
export type OutMessage = typeof OutMessage.Type
