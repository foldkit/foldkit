import { Array, Effect, Match, Option, Schema, pipe } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { evo } from '../struct/index.js'
import * as Story from '../test/story.js'
import {
  type FoldContext,
  type Return,
  type ReturnWithOutMessage,
  type Step,
  type StepWithOutMessage,
  foldChildInits,
} from './public.js'

const SearchModel = Schema.Struct({ query: Schema.String })
type SearchModel = typeof SearchModel.Type

const EditorModel = Schema.Struct({ draft: Schema.String })
type EditorModel = typeof EditorModel.Type

const AppModel = Schema.Struct({
  search: SearchModel,
  editor: EditorModel,
  events: Schema.Array(Schema.String),
})
type AppModel = typeof AppModel.Type

const KeyOrderModel = Schema.Struct({})
type KeyOrderModel = typeof KeyOrderModel.Type

const SearchMessage = defineMessageUnion({ CompletedLoadSearch: {} })
type SearchMessage = typeof SearchMessage.Type

const EditorMessage = defineMessageUnion({ CompletedSaveDraft: {} })
type EditorMessage = typeof EditorMessage.Type

const AppMessage = defineMessageUnion({
  GotSearchMessage: { message: SearchMessage },
  GotEditorMessage: { message: EditorMessage },
})
type AppMessage = typeof AppMessage.Type

const StartedBoot = Schema.TaggedStruct('StartedBoot', {})
type StartedBoot = typeof StartedBoot.Type

const FoldMessage = defineMessageUnion({ RecordedSearchBoot: {} })
type FoldMessage = typeof FoldMessage.Type

const SearchOutMessage = defineMessageUnion({
  RequestedSearchNavigation: {},
  IgnoredSearchNavigation: {},
})
type SearchOutMessage = typeof SearchOutMessage.Type

const EditorOutMessage = defineMessageUnion({ RequestedEditorNavigation: {} })
type EditorOutMessage = typeof EditorOutMessage.Type

const ParentCandidate = defineMessageUnion({
  ForwardedSearchNavigation: {},
  DerivedSearchNavigation: {},
  ForwardedEditorNavigation: {},
})
type ParentCandidate = typeof ParentCandidate.Type

const AppOutMessage = defineMessageUnion({
  FinishedBoot: { eventCount: Schema.Number },
})
type AppOutMessage = typeof AppOutMessage.Type

const WorkspaceModel = Schema.Struct({
  search: SearchModel,
  editor: EditorModel,
})
type WorkspaceModel = typeof WorkspaceModel.Type

const WorkspaceMessage = defineMessageUnion({
  GotSearchMessage: { message: SearchMessage },
  GotEditorMessage: { message: EditorMessage },
})
type WorkspaceMessage = typeof WorkspaceMessage.Type

const WorkspaceSearchOutMessage = defineMessageUnion({
  RestoredQuery: { query: Schema.String },
})
type WorkspaceSearchOutMessage = typeof WorkspaceSearchOutMessage.Type

const WorkspaceEditorOutMessage = defineMessageUnion({
  RestoredDraft: { documentId: Schema.String },
})
type WorkspaceEditorOutMessage = typeof WorkspaceEditorOutMessage.Type

const WorkspaceOutMessage = defineMessageUnion({
  RestoredSearch: { query: Schema.String },
  RestoredEditor: { documentId: Schema.String },
  RestoredWorkspace: {
    maybeQuery: Schema.Option(Schema.String),
    maybeDocumentId: Schema.Option(Schema.String),
  },
})
type WorkspaceOutMessage = typeof WorkspaceOutMessage.Type

const toGotSearchMessage = (message: SearchMessage) =>
  AppMessage.GotSearchMessage({ message })

const toGotEditorMessage = (message: EditorMessage) =>
  AppMessage.GotEditorMessage({ message })

const toGotWorkspaceSearchMessage = (message: SearchMessage) =>
  WorkspaceMessage.GotSearchMessage({ message })

const toGotWorkspaceEditorMessage = (message: EditorMessage) =>
  WorkspaceMessage.GotEditorMessage({ message })

const loadSearch = Command.define('LoadSearch', {
  messages: [SearchMessage.CompletedLoadSearch],
  execute: Effect.succeed(SearchMessage.CompletedLoadSearch()),
})

const saveDraft = Command.define('SaveDraft', {
  messages: [EditorMessage.CompletedSaveDraft],
  execute: Effect.succeed(EditorMessage.CompletedSaveDraft()),
})

const recordSearchBoot = Command.define('RecordSearchBoot', {
  messages: [FoldMessage.RecordedSearchBoot],
  execute: Effect.succeed(FoldMessage.RecordedSearchBoot()),
})

const searchInit: Return<SearchModel, SearchMessage> = {
  model: SearchModel.make({ query: 'foldkit' }),
  commands: [loadSearch()],
}

const editorInit: Return<EditorModel, EditorMessage> = {
  model: EditorModel.make({ draft: 'Draft' }),
  commands: [saveDraft()],
}

const searchInitWithOutMessage: ReturnWithOutMessage<
  SearchModel,
  SearchMessage,
  SearchOutMessage
> = {
  model: SearchModel.make({ query: 'foldkit' }),
  commands: [loadSearch()],
  outMessage: SearchOutMessage.RequestedSearchNavigation(),
}

const editorInitWithOutMessage: ReturnWithOutMessage<
  EditorModel,
  EditorMessage,
  EditorOutMessage
> = {
  model: EditorModel.make({ draft: 'Draft' }),
  commands: [saveDraft()],
  outMessage: EditorOutMessage.RequestedEditorNavigation(),
}

const toAppModel = ({
  search,
  editor,
}: Readonly<{
  search: SearchModel
  editor: EditorModel
}>): AppModel => AppModel.make({ search, editor, events: [] })

describe('foldChildInits', () => {
  it('creates the completed parent Model once and maps child Commands in fold order', () => {
    const factoryCalls = { count: 0 }
    const appInit = foldChildInits(
      { search: searchInit, editor: editorInit },
      {
        toParentModel: childModels => {
          factoryCalls.count += 1
          return toAppModel(childModels)
        },
        folds: {
          search: { toParentMessage: toGotSearchMessage },
          editor: { toParentMessage: toGotEditorMessage },
        },
      },
    )

    expectTypeOf(appInit).toEqualTypeOf<Return<AppModel, AppMessage>>()
    expect(factoryCalls.count).toBe(1)
    expect(appInit.model).toEqual({
      search: { query: 'foldkit' },
      editor: { draft: 'Draft' },
      events: [],
    })
    expect((appInit.commands ?? []).map(command => command.name)).toEqual([
      'LoadSearch',
      'SaveDraft',
    ])
    expect(Object.hasOwn(appInit, 'outMessage')).toBe(false)
  })

  it('infers raw parent Model and disjoint child Message mappers', () => {
    const appInit = foldChildInits(
      { search: searchInit, editor: editorInit },
      {
        toParentModel: ({ search, editor }) =>
          AppModel.make({ search, editor, events: [] }),
        folds: {
          search: { toParentMessage: toGotSearchMessage },
          editor: { toParentMessage: toGotEditorMessage },
        },
      },
    )

    expectTypeOf(appInit.model).toMatchTypeOf<AppModel>()
    expectTypeOf(appInit.commands).toMatchTypeOf<
      Return<AppModel, AppMessage>['commands']
    >()
  })

  it('maps typed child Messages from literal commandless init results', () => {
    const appInit = foldChildInits(
      {
        search: { model: SearchModel.make({ query: 'foldkit' }) },
        editor: { model: EditorModel.make({ draft: 'Draft' }) },
      },
      {
        toParentModel: toAppModel,
        folds: {
          search: { toParentMessage: toGotSearchMessage },
          editor: { toParentMessage: toGotEditorMessage },
        },
      },
    )

    expect(appInit.commands ?? []).toEqual([])
  })

  it('allows an empty child record and runs its Model factory once', () => {
    const factoryCalls = { count: 0 }
    const appInit = foldChildInits(
      {},
      {
        toParentModel: () => {
          factoryCalls.count += 1
          return KeyOrderModel.make({})
        },
        folds: {},
      },
    )

    expect(factoryCalls.count).toBe(1)
    expect(appInit.model).toEqual({})
    expect(appInit.commands ?? []).toEqual([])
    expect(Object.hasOwn(appInit, 'outMessage')).toBe(false)
  })

  it('threads every local fold through the parent Model and resolves named candidates last', () => {
    const resolveCalls = { count: 0 }
    const foldSearchOutMessage = SearchOutMessage.match<
      StepWithOutMessage<AppModel, FoldMessage, ParentCandidate>
    >({
      RequestedSearchNavigation: () => model => ({
        model: evo(model, {
          editor: () => EditorModel.make({ draft: 'Search selected' }),
          events: events => [...events, 'Search'],
        }),
        commands: [recordSearchBoot()],
        outMessage: ParentCandidate.DerivedSearchNavigation(),
      }),
      IgnoredSearchNavigation: () => model => ({ model }),
    })
    const appInit = foldChildInits(
      {
        search: searchInitWithOutMessage,
        editor: editorInitWithOutMessage,
      },
      {
        toParentModel: toAppModel,
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            toParentOutMessage: () =>
              ParentCandidate.ForwardedSearchNavigation(),
            foldOutMessage: foldSearchOutMessage,
          },
          editor: {
            toParentMessage: toGotEditorMessage,
            toParentOutMessage: () =>
              ParentCandidate.ForwardedEditorNavigation(),
            foldOutMessage: (_outMessage: EditorOutMessage) => model => {
              expect(model.editor.draft).toBe('Search selected')
              return {
                model: evo(model, {
                  events: events => [...events, 'Editor'],
                }),
              }
            },
          },
        },
        resolveOutMessage: (candidates, model) => {
          resolveCalls.count += 1
          expect(candidates.search).toEqual(
            ParentCandidate.DerivedSearchNavigation(),
          )
          expect(candidates.editor).toEqual(
            ParentCandidate.ForwardedEditorNavigation(),
          )
          expect(model.events).toEqual(['Search', 'Editor'])
          return AppOutMessage.FinishedBoot({ eventCount: model.events.length })
        },
      },
    )

    expectTypeOf(appInit).toEqualTypeOf<
      ReturnWithOutMessage<AppModel, AppMessage | FoldMessage, AppOutMessage>
    >()
    expect(resolveCalls.count).toBe(1)
    expect(appInit.model.editor.draft).toBe('Search selected')
    expect(appInit.model.events).toEqual(['Search', 'Editor'])
    expect((appInit.commands ?? []).map(command => command.name)).toEqual([
      'LoadSearch',
      'RecordSearchBoot',
      'SaveDraft',
    ])
    expect(appInit.outMessage).toEqual(
      AppOutMessage.FinishedBoot({ eventCount: 2 }),
    )
  })

  it('does not run the resolver or create an OutMessage when no candidate is produced', () => {
    const callbackCounts = { fold: 0, forward: 0, resolver: 0 }
    const silentSearchInit: ReturnWithOutMessage<
      SearchModel,
      SearchMessage,
      SearchOutMessage
    > = searchInit
    const configuration = {
      toParentModel: toAppModel,
      folds: {
        search: {
          toParentMessage: toGotSearchMessage,
          foldOutMessage:
            (_outMessage: SearchOutMessage) => (model: AppModel) => {
              callbackCounts.fold += 1
              return { model }
            },
          toParentOutMessage: () => {
            callbackCounts.forward += 1
            return ParentCandidate.ForwardedSearchNavigation()
          },
        },
        editor: { toParentMessage: toGotEditorMessage },
      },
      resolveOutMessage: () => {
        callbackCounts.resolver += 1
        return AppOutMessage.FinishedBoot({ eventCount: 0 })
      },
    }
    const appInit = foldChildInits(
      { search: silentSearchInit, editor: editorInit },
      configuration,
    )

    expect(callbackCounts).toEqual({ fold: 0, forward: 0, resolver: 0 })
    expect(Object.hasOwn(appInit, 'outMessage')).toBe(false)
  })

  it('skips a forwarded candidate when the same entry derives one', () => {
    const forwardingCalls = { count: 0 }
    const appInit = foldChildInits(
      { search: searchInitWithOutMessage, editor: editorInit },
      {
        toParentModel: toAppModel,
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            toParentOutMessage: () => {
              forwardingCalls.count += 1
              return ParentCandidate.ForwardedSearchNavigation()
            },
            foldOutMessage: (_outMessage: SearchOutMessage) => model => ({
              model,
              outMessage: ParentCandidate.DerivedSearchNavigation(),
            }),
          },
          editor: { toParentMessage: toGotEditorMessage },
        },
        resolveOutMessage: () => AppOutMessage.FinishedBoot({ eventCount: 0 }),
      },
    )

    expect(forwardingCalls.count).toBe(0)
    expect(appInit.outMessage).toEqual(
      AppOutMessage.FinishedBoot({ eventCount: 0 }),
    )
  })

  it('omits the final OutMessage when the resolver returns undefined', () => {
    const appInit = foldChildInits(
      { search: searchInitWithOutMessage, editor: editorInit },
      {
        toParentModel: toAppModel,
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            toParentOutMessage: () =>
              ParentCandidate.ForwardedSearchNavigation(),
          },
          editor: { toParentMessage: toGotEditorMessage },
        },
        resolveOutMessage: () => undefined,
      },
    )

    expect(appInit.outMessage).toBeUndefined()
    expect(Object.hasOwn(appInit, 'outMessage')).toBe(false)
  })

  it('gives each fold a context that maps its child follow-up Commands', () => {
    const appInit = foldChildInits(
      { search: searchInitWithOutMessage, editor: editorInit },
      {
        toParentModel: toAppModel,
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            foldOutMessage:
              (
                _outMessage: SearchOutMessage,
                {
                  liftCommand,
                }: FoldContext<
                  SearchMessage,
                  typeof AppMessage.GotSearchMessage.Type
                >,
              ) =>
              model => ({
                model,
                commands: [liftCommand(loadSearch())],
              }),
          },
          editor: { toParentMessage: toGotEditorMessage },
        },
      },
    )

    expect((appInit.commands ?? []).map(command => command.name)).toEqual([
      'LoadSearch',
      'LoadSearch',
      'SaveDraft',
    ])
    const maybeFollowUp = Array.get(appInit.commands ?? [], 1)
    expect(Option.isSome(maybeFollowUp)).toBe(true)
    if (Option.isSome(maybeFollowUp)) {
      expect(Effect.runSync(maybeFollowUp.value.effect)).toEqual(
        AppMessage.GotSearchMessage({
          message: SearchMessage.CompletedLoadSearch(),
        }),
      )
    }

    const update = (
      model: AppModel,
      message: AppMessage | StartedBoot,
    ): Return<AppModel, AppMessage> => {
      if (message._tag === 'StartedBoot') {
        return appInit
      }

      return { model }
    }
    Story.story(
      update,
      Story.given(
        AppModel.make({
          search: SearchModel.make({ query: '' }),
          editor: EditorModel.make({ draft: '' }),
          events: [],
        }),
      ),
      Story.message(StartedBoot.make({})),
      Story.Command.resolveAll(
        [loadSearch, SearchMessage.CompletedLoadSearch()],
        [loadSearch, SearchMessage.CompletedLoadSearch()],
        [saveDraft, EditorMessage.CompletedSaveDraft()],
      ),
    )
  })

  it('uses the folds record own-key order for every child Command batch', () => {
    const appInit = foldChildInits(
      { search: searchInit, editor: editorInit },
      {
        toParentModel: toAppModel,
        folds: {
          editor: { toParentMessage: toGotEditorMessage },
          search: { toParentMessage: toGotSearchMessage },
        },
      },
    )

    expect((appInit.commands ?? []).map(command => command.name)).toEqual([
      'SaveDraft',
      'LoadSearch',
    ])
  })

  it('includes integer and Symbol child keys in own-key order without prototype folds', () => {
    const symbolChild = Symbol('symbolChild')
    const folds = {
      2: { toParentMessage: toGotSearchMessage },
      1: { toParentMessage: toGotEditorMessage },
      [symbolChild]: { toParentMessage: toGotSearchMessage },
    }
    Object.setPrototypeOf(folds, {
      inherited: { toParentMessage: toGotSearchMessage },
    })
    const appInit = foldChildInits(
      { 2: searchInit, 1: editorInit, [symbolChild]: searchInit },
      {
        toParentModel: () => KeyOrderModel.make({}),
        folds,
      },
    )

    expectTypeOf(appInit).toEqualTypeOf<Return<KeyOrderModel, AppMessage>>()
    expect((appInit.commands ?? []).map(command => command.name)).toEqual([
      'SaveDraft',
      'LoadSearch',
      'LoadSearch',
    ])
  })

  it('rejects missing and extra fold keys before running the parent Model factory', () => {
    const factoryCalls = { count: 0 }
    const folds = {
      search: { toParentMessage: toGotSearchMessage },
      editor: { toParentMessage: toGotEditorMessage },
    }

    Reflect.deleteProperty(folds, 'editor')
    expect(() =>
      foldChildInits(
        { search: searchInit, editor: editorInit },
        {
          toParentModel: childModels => {
            factoryCalls.count += 1
            return toAppModel(childModels)
          },
          folds,
        },
      ),
    ).toThrow('requires one fold for each child init and no extra folds')
    expect(factoryCalls.count).toBe(0)

    const foldsWithExtra = {
      search: { toParentMessage: toGotSearchMessage },
      editor: { toParentMessage: toGotEditorMessage },
    }
    Reflect.set(foldsWithExtra, 'extra', {
      toParentMessage: toGotSearchMessage,
    })
    expect(() =>
      foldChildInits(
        { search: searchInit, editor: editorInit },
        { toParentModel: toAppModel, folds: foldsWithExtra },
      ),
    ).toThrow('requires one fold for each child init and no extra folds')
  })

  const restoreWorkspace = (
    maybeQuery: Option.Option<string>,
    maybeDocumentId: Option.Option<string>,
    resolverCalls: { count: number },
  ) => {
    const searchBoot = Option.match(maybeQuery, {
      onNone: () => ({
        model: SearchModel.make({ query: '' }),
        commands: [loadSearch()],
      }),
      onSome: query => ({
        model: SearchModel.make({ query }),
        commands: [loadSearch()],
        outMessage: WorkspaceSearchOutMessage.RestoredQuery({ query }),
      }),
    })
    const editorBoot = Option.match(maybeDocumentId, {
      onNone: () => ({
        model: EditorModel.make({ draft: '' }),
        commands: [saveDraft()],
      }),
      onSome: documentId => ({
        model: EditorModel.make({ draft: documentId }),
        commands: [saveDraft()],
        outMessage: WorkspaceEditorOutMessage.RestoredDraft({ documentId }),
      }),
    })
    const toParentSearchOutMessage = WorkspaceSearchOutMessage.match({
      RestoredQuery: ({ query }) =>
        WorkspaceOutMessage.RestoredSearch({ query }),
    })
    const toParentEditorOutMessage = WorkspaceEditorOutMessage.match({
      RestoredDraft: ({ documentId }) =>
        WorkspaceOutMessage.RestoredEditor({ documentId }),
    })

    return foldChildInits(
      { search: searchBoot, editor: editorBoot },
      {
        toParentModel: ({ search, editor }) =>
          WorkspaceModel.make({ search, editor }),
        folds: {
          search: {
            toParentMessage: toGotWorkspaceSearchMessage,
            toParentOutMessage: toParentSearchOutMessage,
          },
          editor: {
            toParentMessage: toGotWorkspaceEditorMessage,
            toParentOutMessage: toParentEditorOutMessage,
          },
        },
        resolveOutMessage: ({ search, editor }) => {
          resolverCalls.count += 1
          return WorkspaceOutMessage.RestoredWorkspace({
            maybeQuery: pipe(
              Option.fromNullishOr(search),
              Option.map(outMessage =>
                Match.value(outMessage).pipe(
                  Match.tagsExhaustive({
                    RestoredSearch: ({ query }) => query,
                  }),
                ),
              ),
            ),
            maybeDocumentId: pipe(
              Option.fromNullishOr(editor),
              Option.map(outMessage =>
                Match.value(outMessage).pipe(
                  Match.tagsExhaustive({
                    RestoredEditor: ({ documentId }) => documentId,
                  }),
                ),
              ),
            ),
          })
        },
      },
    )
  }

  it.each([
    ['neither', Option.none(), Option.none(), 0],
    ['Search only', Option.some(''), Option.none(), 1],
    ['Editor only', Option.none(), Option.some('document-42'), 1],
    [
      'Search and Editor',
      Option.some('foldkit'),
      Option.some('document-42'),
      1,
    ],
  ])(
    'resolves a workspace restoration from %s',
    (_source, maybeQuery, maybeDocumentId, expectedResolverCalls) => {
      const resolverCalls = { count: 0 }
      const workspaceBoot = restoreWorkspace(
        maybeQuery,
        maybeDocumentId,
        resolverCalls,
      )

      expect(resolverCalls.count).toBe(expectedResolverCalls)
      if (expectedResolverCalls === 0) {
        expect(Object.hasOwn(workspaceBoot, 'outMessage')).toBe(false)
      } else {
        expect(workspaceBoot.outMessage).toEqual(
          WorkspaceOutMessage.RestoredWorkspace({
            maybeQuery,
            maybeDocumentId,
          }),
        )
      }
    },
  )
})

describe('foldChildInits inference', () => {
  const SearchRequirements = Schema.Struct({ searchService: Schema.String })
  type SearchRequirements = typeof SearchRequirements.Type
  const EditorRequirements = Schema.Struct({ editorService: Schema.String })
  type EditorRequirements = typeof EditorRequirements.Type
  const FoldRequirements = Schema.Struct({ foldService: Schema.String })
  type FoldRequirements = typeof FoldRequirements.Type

  const loadSearchWithRequirements: Command.Command<
    SearchMessage,
    never,
    SearchRequirements
  > = {
    name: 'LoadSearchWithRequirements',
    effect: Effect.context<SearchRequirements>().pipe(
      Effect.as(SearchMessage.CompletedLoadSearch()),
    ),
  }
  const recordSearchBootWithRequirements: Command.Command<
    FoldMessage,
    never,
    FoldRequirements
  > = {
    name: 'RecordSearchBootWithRequirements',
    effect: Effect.context<FoldRequirements>().pipe(
      Effect.as(FoldMessage.RecordedSearchBoot()),
    ),
  }
  const saveDraftWithRequirements: Command.Command<
    EditorMessage,
    never,
    EditorRequirements
  > = {
    name: 'SaveDraftWithRequirements',
    effect: Effect.context<EditorRequirements>().pipe(
      Effect.as(EditorMessage.CompletedSaveDraft()),
    ),
  }
  const searchInitWithRequirements: ReturnWithOutMessage<
    SearchModel,
    SearchMessage,
    SearchOutMessage,
    SearchRequirements
  > = {
    model: SearchModel.make({ query: 'foldkit' }),
    commands: [loadSearchWithRequirements],
    outMessage: SearchOutMessage.RequestedSearchNavigation(),
  }
  const editorInitWithRequirements: Return<
    EditorModel,
    EditorMessage,
    EditorRequirements
  > = {
    model: EditorModel.make({ draft: 'Draft' }),
    commands: [saveDraftWithRequirements],
  }
  const foldSearchOutMessageWithRequirements = SearchOutMessage.match<
    Step<AppModel, FoldMessage, FoldRequirements>
  >({
    RequestedSearchNavigation: () => model => ({
      model,
      commands: [recordSearchBootWithRequirements],
    }),
    IgnoredSearchNavigation: () => model => ({ model }),
  })
  const foldSearchOutMessageWithCandidate = SearchOutMessage.match<
    StepWithOutMessage<AppModel, FoldMessage, ParentCandidate, FoldRequirements>
  >({
    RequestedSearchNavigation: () => model => ({
      model,
      commands: [recordSearchBootWithRequirements],
      outMessage: ParentCandidate.DerivedSearchNavigation(),
    }),
    IgnoredSearchNavigation: () => model => ({ model }),
  })
  const foldSearchOutMessageWithDerivedCandidate = SearchOutMessage.match<
    StepWithOutMessage<
      AppModel,
      FoldMessage,
      typeof ParentCandidate.DerivedSearchNavigation.Type,
      FoldRequirements
    >
  >({
    RequestedSearchNavigation: () => model => ({
      model,
      commands: [recordSearchBootWithRequirements],
      outMessage: ParentCandidate.DerivedSearchNavigation(),
    }),
    IgnoredSearchNavigation: () => model => ({ model }),
  })
  const optionalFoldWithForward: Readonly<{
    toParentMessage: typeof toGotSearchMessage
    toParentOutMessage: (
      outMessage: SearchOutMessage,
    ) => typeof ParentCandidate.ForwardedSearchNavigation.Type
    foldOutMessage?: (
      outMessage: SearchOutMessage,
      context: FoldContext<
        SearchMessage,
        typeof AppMessage.GotSearchMessage.Type
      >,
    ) => StepWithOutMessage<
      AppModel,
      FoldMessage,
      typeof ParentCandidate.DerivedSearchNavigation.Type,
      FoldRequirements
    >
  }> = {
    toParentMessage: toGotSearchMessage,
    toParentOutMessage: () => ParentCandidate.ForwardedSearchNavigation(),
  }
  const requiredFoldWithOptionalForward: Readonly<{
    toParentMessage: typeof toGotSearchMessage
    foldOutMessage: (
      outMessage: SearchOutMessage,
      context: FoldContext<
        SearchMessage,
        typeof AppMessage.GotSearchMessage.Type
      >,
    ) => Step<AppModel, FoldMessage, FoldRequirements>
    toParentOutMessage?: (
      outMessage: SearchOutMessage,
    ) => typeof ParentCandidate.ForwardedSearchNavigation.Type
  }> = {
    toParentMessage: toGotSearchMessage,
    foldOutMessage: foldSearchOutMessageWithRequirements,
  }

  it('unifies child and local fold Message and service requirements', () => {
    const appInit = foldChildInits(
      {
        search: searchInitWithRequirements,
        editor: editorInitWithRequirements,
      },
      {
        toParentModel: toAppModel,
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            foldOutMessage: foldSearchOutMessageWithRequirements,
          },
          editor: { toParentMessage: toGotEditorMessage },
        },
      },
    )

    expectTypeOf(appInit).toEqualTypeOf<
      Return<
        AppModel,
        AppMessage | FoldMessage,
        SearchRequirements | EditorRequirements | FoldRequirements
      >
    >()
  })

  it('infers the documentation workspace resolver from two forwarded child facts', () => {
    const restoredSearchInit: ReturnWithOutMessage<
      SearchModel,
      SearchMessage,
      WorkspaceSearchOutMessage,
      SearchRequirements
    > = {
      model: SearchModel.make({ query: 'foldkit' }),
      commands: [loadSearchWithRequirements],
      outMessage: WorkspaceSearchOutMessage.RestoredQuery({
        query: 'foldkit',
      }),
    }
    const restoredEditorInit: ReturnWithOutMessage<
      EditorModel,
      EditorMessage,
      WorkspaceEditorOutMessage,
      EditorRequirements
    > = {
      model: EditorModel.make({ draft: 'document-42' }),
      commands: [saveDraftWithRequirements],
      outMessage: WorkspaceEditorOutMessage.RestoredDraft({
        documentId: 'document-42',
      }),
    }
    const toParentSearchOutMessage = WorkspaceSearchOutMessage.match({
      RestoredQuery: ({ query }) =>
        WorkspaceOutMessage.RestoredSearch({ query }),
    })
    const toParentEditorOutMessage = WorkspaceEditorOutMessage.match({
      RestoredDraft: ({ documentId }) =>
        WorkspaceOutMessage.RestoredEditor({ documentId }),
    })
    const workspaceBoot = foldChildInits(
      { search: restoredSearchInit, editor: restoredEditorInit },
      {
        toParentModel: ({ search, editor }) =>
          WorkspaceModel.make({ search, editor }),
        folds: {
          search: {
            toParentMessage: toGotWorkspaceSearchMessage,
            toParentOutMessage: toParentSearchOutMessage,
          },
          editor: {
            toParentMessage: toGotWorkspaceEditorMessage,
            toParentOutMessage: toParentEditorOutMessage,
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

          return WorkspaceOutMessage.RestoredWorkspace({
            maybeQuery: pipe(
              Option.fromNullishOr(search),
              Option.map(outMessage =>
                Match.value(outMessage).pipe(
                  Match.tagsExhaustive({
                    RestoredSearch: ({ query }) => query,
                  }),
                ),
              ),
            ),
            maybeDocumentId: pipe(
              Option.fromNullishOr(editor),
              Option.map(outMessage =>
                Match.value(outMessage).pipe(
                  Match.tagsExhaustive({
                    RestoredEditor: ({ documentId }) => documentId,
                  }),
                ),
              ),
            ),
          })
        },
      },
    )

    expectTypeOf(workspaceBoot).toEqualTypeOf<
      ReturnWithOutMessage<
        WorkspaceModel,
        WorkspaceMessage,
        typeof WorkspaceOutMessage.RestoredWorkspace.Type,
        SearchRequirements | EditorRequirements
      >
    >()
  })

  it('keeps an inline Schema factory Model for standalone local and outward folds', () => {
    const localInit = foldChildInits(
      { search: searchInitWithRequirements, editor: editorInit },
      {
        toParentModel: ({ search, editor }) =>
          AppModel.make({ search, editor, events: [] }),
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            foldOutMessage: foldSearchOutMessageWithRequirements,
          },
          editor: { toParentMessage: toGotEditorMessage },
        },
      },
    )
    const outwardInit = foldChildInits(
      { search: searchInitWithRequirements, editor: editorInit },
      {
        toParentModel: ({ search, editor }) =>
          AppModel.make({ search, editor, events: [] }),
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            toParentOutMessage: () =>
              ParentCandidate.ForwardedSearchNavigation(),
            foldOutMessage: foldSearchOutMessageWithDerivedCandidate,
          },
          editor: { toParentMessage: toGotEditorMessage },
        },
        resolveOutMessage: (candidates, model) => {
          expectTypeOf(model).not.toBeAny()
          expectTypeOf(model).toEqualTypeOf<AppModel>()
          expectTypeOf(candidates.search).toEqualTypeOf<
            | typeof ParentCandidate.ForwardedSearchNavigation.Type
            | typeof ParentCandidate.DerivedSearchNavigation.Type
            | undefined
          >()
          expectTypeOf(candidates.editor).toEqualTypeOf<undefined>()
          return AppOutMessage.FinishedBoot({ eventCount: model.events.length })
        },
      },
    )

    expectTypeOf(localInit).toEqualTypeOf<
      Return<
        AppModel,
        AppMessage | FoldMessage,
        SearchRequirements | FoldRequirements
      >
    >()
    expectTypeOf(outwardInit).toEqualTypeOf<
      ReturnWithOutMessage<
        AppModel,
        AppMessage | FoldMessage,
        typeof AppOutMessage.FinishedBoot.Type,
        SearchRequirements | FoldRequirements
      >
    >()
  })

  it('contextually types a fully inline fold against the factory Model', () => {
    const rejectedUnknownModelProperty = () => {
      foldChildInits(
        { search: searchInitWithOutMessage, editor: editorInit },
        {
          toParentModel: ({ search, editor }) =>
            AppModel.make({ search, editor, events: [] }),
          folds: {
            search: {
              toParentMessage: toGotSearchMessage,
              foldOutMessage: (_outMessage: SearchOutMessage) => model => {
                expectTypeOf(model).toEqualTypeOf<AppModel>()

                // @ts-expect-error the inline fold Model has no arbitrary fields
                void model.notAField
                return { model }
              },
            },
            editor: { toParentMessage: toGotEditorMessage },
          },
        },
      )
    }

    expect(rejectedUnknownModelProperty).toBeTypeOf('function')
  })

  it('infers raw inline mappers and Model factories with a local fold', () => {
    const appInit = foldChildInits(
      { search: searchInitWithOutMessage, editor: editorInit },
      {
        toParentModel: ({ search, editor }) => ({ search, editor, events: [] }),
        folds: {
          search: {
            toParentMessage: message =>
              AppMessage.GotSearchMessage({ message }),
            foldOutMessage: (_outMessage: SearchOutMessage) => model => ({
              model,
            }),
          },
          editor: {
            toParentMessage: message =>
              AppMessage.GotEditorMessage({ message }),
          },
        },
      },
    )

    expectTypeOf(appInit.model).toMatchTypeOf<AppModel>()
    expectTypeOf(appInit.commands).toEqualTypeOf<
      Return<AppModel, AppMessage>['commands']
    >()
  })

  it('unifies requirements and Messages when the resolver returns an OutMessage', () => {
    const appInit = foldChildInits(
      { search: searchInitWithRequirements, editor: editorInit },
      {
        toParentModel: toAppModel,
        folds: {
          search: {
            toParentMessage: toGotSearchMessage,
            foldOutMessage: foldSearchOutMessageWithCandidate,
          },
          editor: { toParentMessage: toGotEditorMessage },
        },
        resolveOutMessage: () => AppOutMessage.FinishedBoot({ eventCount: 0 }),
      },
    )

    expectTypeOf(appInit).toEqualTypeOf<
      ReturnWithOutMessage<
        AppModel,
        AppMessage | FoldMessage,
        typeof AppOutMessage.FinishedBoot.Type,
        SearchRequirements | FoldRequirements
      >
    >()
  })

  it('keeps optional fold and forwarding candidates in the return type', () => {
    const optionalFoldInit = foldChildInits(
      { search: searchInitWithRequirements, editor: editorInit },
      {
        toParentModel: toAppModel,
        folds: {
          search: optionalFoldWithForward,
          editor: { toParentMessage: toGotEditorMessage },
        },
        resolveOutMessage: candidates => {
          expectTypeOf(candidates.search).toEqualTypeOf<
            | typeof ParentCandidate.ForwardedSearchNavigation.Type
            | typeof ParentCandidate.DerivedSearchNavigation.Type
            | undefined
          >()
          expectTypeOf(candidates.editor).toEqualTypeOf<undefined>()
          return AppOutMessage.FinishedBoot({ eventCount: 0 })
        },
      },
    )
    const optionalForwardInit = foldChildInits(
      { search: searchInitWithRequirements, editor: editorInit },
      {
        toParentModel: toAppModel,
        folds: {
          search: requiredFoldWithOptionalForward,
          editor: { toParentMessage: toGotEditorMessage },
        },
        resolveOutMessage: candidates => {
          expectTypeOf(candidates.search).toEqualTypeOf<
            typeof ParentCandidate.ForwardedSearchNavigation.Type | undefined
          >()
          expectTypeOf(candidates.editor).toEqualTypeOf<undefined>()
          return AppOutMessage.FinishedBoot({ eventCount: 0 })
        },
      },
    )

    expectTypeOf(optionalFoldInit).toEqualTypeOf<
      ReturnWithOutMessage<
        AppModel,
        AppMessage | FoldMessage,
        typeof AppOutMessage.FinishedBoot.Type,
        SearchRequirements | FoldRequirements
      >
    >()
    expectTypeOf(optionalForwardInit).toEqualTypeOf<
      ReturnWithOutMessage<
        AppModel,
        AppMessage | FoldMessage,
        typeof AppOutMessage.FinishedBoot.Type,
        SearchRequirements | FoldRequirements
      >
    >()
  })

  it('rejects a child OutMessage without a local fold or forwarding adapter', () => {
    const rejectedUnhandledOutMessage = () => {
      foldChildInits(
        {
          search: searchInitWithOutMessage,
          editor: editorInit,
        },
        {
          toParentModel: toAppModel,
          folds: {
            // @ts-expect-error a child OutMessage needs a local fold or forwarding adapter
            search: { toParentMessage: toGotSearchMessage },
            editor: { toParentMessage: toGotEditorMessage },
          },
        },
      )
    }

    expect(rejectedUnhandledOutMessage).toBeTypeOf('function')
  })

  it('is data-first only', () => {
    const rejectedDataLastCall = () => {
      // @ts-expect-error foldChildInits takes child inits first and does not return a Step
      foldChildInits({
        toParentModel: toAppModel,
        folds: {
          search: { toParentMessage: toGotSearchMessage },
          editor: { toParentMessage: toGotEditorMessage },
        },
      })({ search: searchInit, editor: editorInit })
    }

    expect(rejectedDataLastCall).toBeTypeOf('function')
  })

  it('requires a resolver when an entry can emit a parent candidate', () => {
    const rejectedMissingResolver = () => {
      foldChildInits(
        { search: searchInitWithOutMessage, editor: editorInit },
        // @ts-expect-error forwarding an OutMessage requires resolveOutMessage
        {
          toParentModel: toAppModel,
          folds: {
            search: {
              toParentMessage: toGotSearchMessage,
              toParentOutMessage: () =>
                ParentCandidate.ForwardedSearchNavigation(),
            },
            editor: { toParentMessage: toGotEditorMessage },
          },
        },
      )
    }

    expect(rejectedMissingResolver).toBeTypeOf('function')
  })

  it('rejects handlers with a child Message or parent Model from another entry', () => {
    const rejectedWrongHandler = () => {
      foldChildInits(
        { search: searchInit, editor: editorInit },
        {
          toParentModel: toAppModel,
          folds: {
            // @ts-expect-error search Commands produce SearchMessage, not EditorMessage
            search: { toParentMessage: toGotEditorMessage },
            editor: { toParentMessage: toGotEditorMessage },
          },
        },
      )
    }
    const rejectedWrongModel = () => {
      foldChildInits(
        { search: searchInitWithOutMessage, editor: editorInit },
        {
          toParentModel: toAppModel,
          folds: {
            // @ts-expect-error an OutMessage fold runs against AppModel
            search: {
              toParentMessage: toGotSearchMessage,
              foldOutMessage:
                (
                  _outMessage: SearchOutMessage,
                ): Step<EditorModel, AppMessage> =>
                editor => ({ model: editor }),
            },
            editor: { toParentMessage: toGotEditorMessage },
          },
        },
      )
    }

    expect(rejectedWrongHandler).toBeTypeOf('function')
    expect(rejectedWrongModel).toBeTypeOf('function')
  })

  it('rejects a FoldContext that lifts child Messages into another entry wrapper', () => {
    const rejectedWrongContext = () => {
      foldChildInits(
        { search: searchInitWithOutMessage, editor: editorInit },
        {
          toParentModel: toAppModel,
          folds: {
            // @ts-expect-error the Search fold context lifts only GotSearchMessage
            search: {
              toParentMessage: toGotSearchMessage,
              foldOutMessage:
                (
                  _outMessage: SearchOutMessage,
                  {
                    liftCommand,
                  }: FoldContext<
                    SearchMessage,
                    typeof AppMessage.GotEditorMessage.Type
                  >,
                ) =>
                model => ({ model, commands: [liftCommand(loadSearch())] }),
            },
            editor: { toParentMessage: toGotEditorMessage },
          },
        },
      )
    }

    expect(rejectedWrongContext).toBeTypeOf('function')
  })

  it('keeps an unannotated FoldContext at unknown until the handler annotates it', () => {
    const rawContext = () => {
      foldChildInits(
        { search: searchInitWithOutMessage, editor: editorInit },
        {
          toParentModel: toAppModel,
          folds: {
            search: {
              toParentMessage: toGotSearchMessage,
              foldOutMessage: (_outMessage, { liftCommand }) => {
                const lifted = liftCommand(loadSearch())
                expectTypeOf(lifted).toEqualTypeOf<Command.Command<unknown>>()

                // @ts-expect-error an unannotated context cannot lift into a known parent Message
                const typedLifted: Command.Command<
                  typeof AppMessage.GotSearchMessage.Type
                > = lifted
                void typedLifted

                return model => ({ model })
              },
            },
            editor: { toParentMessage: toGotEditorMessage },
          },
        },
      )
    }

    expect(rawContext).toBeTypeOf('function')
  })

  it('rejects extra folds in inline and pretyped records', () => {
    const rejectedInlineExtra = () => {
      foldChildInits(
        { search: searchInit, editor: editorInit },
        {
          toParentModel: toAppModel,
          folds: {
            search: { toParentMessage: toGotSearchMessage },
            editor: { toParentMessage: toGotEditorMessage },
            // @ts-expect-error each fold key must name a child init
            extra: { toParentMessage: toGotSearchMessage },
          },
        },
      )
    }
    const foldsWithExtra = {
      search: { toParentMessage: toGotSearchMessage },
      editor: { toParentMessage: toGotEditorMessage },
      extra: { toParentMessage: toGotSearchMessage },
    }
    const rejectedPretypedExtra = () => {
      foldChildInits(
        { search: searchInit, editor: editorInit },
        {
          toParentModel: toAppModel,
          // @ts-expect-error exact fold keys also reject pretyped records
          folds: foldsWithExtra,
        },
      )
    }

    expect(rejectedInlineExtra).toBeTypeOf('function')
    expect(rejectedPretypedExtra).toBeTypeOf('function')
  })

  it('rejects missing folds in inline and pretyped records', () => {
    const rejectedInlineMissing = () => {
      foldChildInits(
        { search: searchInit, editor: editorInit },
        {
          toParentModel: toAppModel,
          // @ts-expect-error each child init requires a fold
          folds: {
            search: { toParentMessage: toGotSearchMessage },
          },
        },
      )
    }
    const foldsWithoutEditor = {
      search: { toParentMessage: toGotSearchMessage },
    }
    const rejectedPretypedMissing = () => {
      foldChildInits(
        { search: searchInit, editor: editorInit },
        {
          toParentModel: toAppModel,
          // @ts-expect-error exact fold keys also reject pretyped records missing a child
          folds: foldsWithoutEditor,
        },
      )
    }

    expect(rejectedInlineMissing).toBeTypeOf('function')
    expect(rejectedPretypedMissing).toBeTypeOf('function')
  })
})
