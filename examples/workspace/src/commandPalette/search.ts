import { Array, Schema } from 'effect'

import { Issue, Project } from '../domain'
import { ResultTarget } from './resultTarget'

export const SearchResult = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  target: ResultTarget,
})
export type SearchResult = typeof SearchResult.Type

const MAX_RESULTS = 12

export const searchResults = (
  query: string,
  issues: ReadonlyArray<Issue>,
  projects: ReadonlyArray<Project>,
): ReadonlyArray<SearchResult> => {
  const searchText = query.trim().toLowerCase()

  const matchingProjects = Array.filter(projects, project =>
    `${project.name} ${project.description}`.toLowerCase().includes(searchText),
  )

  const projectResults = Array.map(matchingProjects, project =>
    SearchResult.make({
      id: `project-${project.id}`,
      title: project.name,
      description: 'Project',
      target: ResultTarget.Project({ projectId: project.id }),
    }),
  )

  const matchingIssues = Array.filter(issues, issue =>
    `${issue.identifier} ${issue.title}`.toLowerCase().includes(searchText),
  )

  const issueResults = Array.map(matchingIssues, issue =>
    SearchResult.make({
      id: `issue-${issue.id}`,
      title: issue.title,
      description: issue.identifier,
      target: ResultTarget.Issue({ issueId: issue.id }),
    }),
  )

  return Array.take([...projectResults, ...issueResults], MAX_RESULTS)
}
