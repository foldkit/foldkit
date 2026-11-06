import { Array, Schema } from 'effect'

export const Project = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
})
export type Project = typeof Project.Type

export const findById = (projects: ReadonlyArray<Project>, projectId: string) =>
  Array.findFirst(projects, project => project.id === projectId)
