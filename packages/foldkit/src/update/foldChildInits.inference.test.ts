import { Effect, Schema } from 'effect'
import { expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { type ReturnWithOutMessage, foldChildInits } from './public.js'

const SearchModel = Schema.Struct({ query: Schema.String })
type SearchModel = typeof SearchModel.Type

const EditorModel = Schema.Struct({ draft: Schema.String })
type EditorModel = typeof EditorModel.Type

const WorkspaceModel = Schema.Struct({
  search: SearchModel,
  editor: EditorModel,
})
type WorkspaceModel = typeof WorkspaceModel.Type

const SearchMessage = defineMessageUnion({ CompletedLoadSearch: {} })
type SearchMessage = typeof SearchMessage.Type

const EditorMessage = defineMessageUnion({ CompletedLoadEditor: {} })
type EditorMessage = typeof EditorMessage.Type

const WorkspaceMessage = defineMessageUnion({
  GotSearchMessage: { message: SearchMessage },
  GotEditorMessage: { message: EditorMessage },
})
type WorkspaceMessage = typeof WorkspaceMessage.Type

const SearchOutMessage = defineMessageUnion({
  RestoredQuery: { query: Schema.String },
})
type SearchOutMessage = typeof SearchOutMessage.Type

const EditorOutMessage = defineMessageUnion({
  RestoredDraft: { documentId: Schema.String },
})
type EditorOutMessage = typeof EditorOutMessage.Type

const WorkspaceOutMessage = defineMessageUnion({
  RestoredSearch: { query: Schema.String },
  RestoredEditor: { documentId: Schema.String },
  RestoredWorkspace: {},
})

const SearchRequirements = Schema.Struct({ searchService: Schema.String })
type SearchRequirements = typeof SearchRequirements.Type

const EditorRequirements = Schema.Struct({ editorService: Schema.String })
type EditorRequirements = typeof EditorRequirements.Type

const loadSearch: Command.Command<SearchMessage, never, SearchRequirements> = {
  name: 'LoadSearch',
  effect: Effect.context<SearchRequirements>().pipe(
    Effect.as(SearchMessage.CompletedLoadSearch()),
  ),
}

const loadEditor: Command.Command<EditorMessage, never, EditorRequirements> = {
  name: 'LoadEditor',
  effect: Effect.context<EditorRequirements>().pipe(
    Effect.as(EditorMessage.CompletedLoadEditor()),
  ),
}

const toWorkspaceSearchMessage = (message: SearchMessage) =>
  WorkspaceMessage.GotSearchMessage({ message })

const toWorkspaceEditorMessage = (message: EditorMessage) =>
  WorkspaceMessage.GotEditorMessage({ message })

const searchInit: ReturnWithOutMessage<
  SearchModel,
  SearchMessage,
  SearchOutMessage,
  SearchRequirements
> = {
  model: SearchModel.make({ query: 'foldkit' }),
  commands: [loadSearch],
  outMessage: SearchOutMessage.RestoredQuery({ query: 'foldkit' }),
}

const editorInit: ReturnWithOutMessage<
  EditorModel,
  EditorMessage,
  EditorOutMessage,
  EditorRequirements
> = {
  model: EditorModel.make({ draft: 'document-42' }),
  commands: [loadEditor],
  outMessage: EditorOutMessage.RestoredDraft({
    documentId: 'document-42',
  }),
}

describe('foldChildInits generic mapper inference', () => {
  it('does not report never for unresolved inline generic matchers', () => {
    const workspaceInit = foldChildInits(
      { search: searchInit, editor: editorInit },
      {
        toParentModel: ({ search, editor }) =>
          WorkspaceModel.make({ search, editor }),
        folds: {
          search: {
            toParentMessage: toWorkspaceSearchMessage,
            toParentOutMessage: SearchOutMessage.match({
              RestoredQuery: () =>
                WorkspaceOutMessage.RestoredSearch({ query: 'foldkit' }),
            }),
          },
          editor: {
            toParentMessage: toWorkspaceEditorMessage,
            toParentOutMessage: EditorOutMessage.match({
              RestoredDraft: () =>
                WorkspaceOutMessage.RestoredEditor({
                  documentId: 'document-42',
                }),
            }),
          },
        },
        resolveOutMessage: (_candidates, model) => {
          expectTypeOf(model).toEqualTypeOf<WorkspaceModel>()

          return WorkspaceOutMessage.RestoredWorkspace()
        },
      },
    )

    expectTypeOf(workspaceInit).toEqualTypeOf<
      ReturnWithOutMessage<WorkspaceModel, unknown, unknown, unknown>
    >()
  })

  it('preserves precise types for explicit generic matcher outputs', () => {
    const workspaceInit = foldChildInits(
      { search: searchInit, editor: editorInit },
      {
        toParentModel: ({ search, editor }) =>
          WorkspaceModel.make({ search, editor }),
        folds: {
          search: {
            toParentMessage: toWorkspaceSearchMessage,
            toParentOutMessage: SearchOutMessage.match<
              typeof WorkspaceOutMessage.RestoredSearch.Type
            >({
              RestoredQuery: ({ query }) =>
                WorkspaceOutMessage.RestoredSearch({ query }),
            }),
          },
          editor: {
            toParentMessage: toWorkspaceEditorMessage,
            toParentOutMessage: EditorOutMessage.match<
              typeof WorkspaceOutMessage.RestoredEditor.Type
            >({
              RestoredDraft: ({ documentId }) =>
                WorkspaceOutMessage.RestoredEditor({ documentId }),
            }),
          },
        },
        resolveOutMessage: ({ search, editor }, model) => {
          expectTypeOf(search).toEqualTypeOf<
            typeof WorkspaceOutMessage.RestoredSearch.Type | undefined
          >()
          expectTypeOf(editor).toEqualTypeOf<
            typeof WorkspaceOutMessage.RestoredEditor.Type | undefined
          >()
          expectTypeOf(model).toEqualTypeOf<WorkspaceModel>()

          return WorkspaceOutMessage.RestoredWorkspace()
        },
      },
    )

    expectTypeOf(workspaceInit).toEqualTypeOf<
      ReturnWithOutMessage<
        WorkspaceModel,
        WorkspaceMessage,
        typeof WorkspaceOutMessage.RestoredWorkspace.Type,
        SearchRequirements | EditorRequirements
      >
    >()
  })
})
