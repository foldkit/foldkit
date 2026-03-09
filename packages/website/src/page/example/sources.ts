import counterSources from 'virtual:example-sources/counter'
import formSources from 'virtual:example-sources/form'
import stopwatchSources from 'virtual:example-sources/stopwatch'
import todoSources from 'virtual:example-sources/todo'

type ExampleSources = Readonly<{
  files: ReadonlyArray<
    Readonly<{
      path: string
      highlightedHtml: string
      rawCode: string
    }>
  >
}>

const sourcesBySlug: Record<string, ExampleSources> = {
  counter: counterSources,
  todo: todoSources,
  stopwatch: stopwatchSources,
  form: formSources,
}

const EMPTY_SOURCES: ExampleSources = { files: [] }

export const getSourcesForSlug = (slug: string): ExampleSources =>
  sourcesBySlug[slug] ?? EMPTY_SOURCES
