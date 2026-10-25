import { Effect, Layer, Option, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as ModelPreservationBridge from '../../runtime/modelPreservationBridge.js'
import * as Program from '../../runtime/programPublic.js'
import { embed } from '../../runtime/start.js'
import { modifyFields } from '../../struct/index.js'
import * as Story from '../../test/story.js'
import { define } from './agentContext.js'

const Model = Schema.Struct({
  page: Schema.Literals(['Inbox', 'Thread', 'Settings']),
  maybeOpenThreadId: Schema.Option(Schema.String),
  selectedThreadIds: Schema.Array(Schema.String),
  filter: Schema.Literals(['All', 'Unread', 'Flagged']),
  sessionToken: Schema.String,
  draftBody: Schema.String,
})
type Model = typeof Model.Type

const inboxModel: Model = {
  page: 'Thread',
  maybeOpenThreadId: Option.some('thread-7'),
  selectedThreadIds: ['thread-7', 'thread-9'],
  filter: 'Unread',
  sessionToken: 'secret-token',
  draftBody: 'Private draft',
}

const ThreadId = Schema.String.annotate({ identifier: 'ThreadId' })

const WorkspaceAgentContext = define(
  Model,
  {
    page: Schema.Literals(['Inbox', 'Thread', 'Settings']).annotate({
      description: 'The page the person is looking at',
    }),
    maybeOpenThreadId: Schema.Option(ThreadId),
    selectedThreadIds: Schema.Array(ThreadId),
    filter: Schema.Literals(['All', 'Unread', 'Flagged']),
  },
  { read: model => model },
)

const Message = defineMessageUnion({
  SubmittedPrompt: { prompt: Schema.String },
  CompletedSendAgentTurn: {},
  TypedDraft: {},
  ClickedFlaggedFilter: {},
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const SendAgentTurn = ApplicationDefinition.makeCommand('SendAgentTurn', {
  args: { prompt: Schema.String, context: WorkspaceAgentContext.Context },
  messages: [Message.CompletedSendAgentTurn],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedSendAgentTurn())
  },
})

const publishedContexts: Array<Schema.Json> = []

const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  agentContext: entry('PublishAgentContext', WorkspaceAgentContext.fields, {
    messages: [],
    modelToDependencies: WorkspaceAgentContext.read,
    handler: function* () {
      return context =>
        Stream.fromEffect(
          Effect.sync(() => {
            publishedContexts.push(WorkspaceAgentContext.encode(context))
          }),
        ).pipe(Stream.drain)
    },
  }),
}))

const ApplicationComposition = ApplicationDefinition.makeComposition()

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    SubmittedPrompt: ({ prompt }) => ({
      model,
      commands: [
        SendAgentTurn({ prompt, context: WorkspaceAgentContext.read(model) }),
      ],
    }),
    CompletedSendAgentTurn: () => ({ model }),
    TypedDraft: () => ({
      model: modifyFields(model, { draftBody: draftBody => `${draftBody}x` }),
    }),
    ClickedFlaggedFilter: () => ({
      model: modifyFields(model, { filter: () => 'Flagged' }),
    }),
  }),
)

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init: () => ({ model: inboxModel }),
    update,
    view: ApplicationComposition.makeView((model, h) =>
      h.div(
        [],
        [
          h.p([], [`${model.filter} ${model.draftBody}`]),
          h.button([h.OnClick(Message.TypedDraft())], ['Type']),
          h.button([h.OnClick(Message.ClickedFlaggedFilter())], ['Flagged']),
        ],
      ),
    ),
    subscriptions,
    EffectsLayer: Layer.mergeAll(subscriptions.layer, SendAgentTurn.layer),
  })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const encodeModelContext = (model: Model): Schema.Json =>
  WorkspaceAgentContext.encode(WorkspaceAgentContext.read(model))

describe('AgentContext', () => {
  it('reads the declared context from the Model', () => {
    expect(WorkspaceAgentContext.read(inboxModel)).toEqual({
      page: 'Thread',
      maybeOpenThreadId: Option.some('thread-7'),
      selectedThreadIds: ['thread-7', 'thread-9'],
      filter: 'Unread',
    })
  })

  it('encodes the context as JSON', () => {
    const context = WorkspaceAgentContext.read(inboxModel)

    expect(WorkspaceAgentContext.encode(context)).toEqual({
      page: 'Thread',
      maybeOpenThreadId: { _tag: 'Some', value: 'thread-7' },
      selectedThreadIds: ['thread-7', 'thread-9'],
      filter: 'Unread',
    })
  })

  it('leaves out every field the context does not declare', () => {
    const context = WorkspaceAgentContext.read(inboxModel)
    const encoded = JSON.stringify(WorkspaceAgentContext.encode(context))

    expect(Object.keys(context)).toEqual([
      'page',
      'maybeOpenThreadId',
      'selectedThreadIds',
      'filter',
    ])
    expect(encoded).not.toContain('secret-token')
    expect(encoded).not.toContain('Private draft')
  })

  it('describes the declared fields as a standalone JSON Schema', () => {
    const { jsonSchema } = WorkspaceAgentContext

    expect(jsonSchema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      required: ['page', 'maybeOpenThreadId', 'selectedThreadIds', 'filter'],
      properties: {
        page: {
          enum: ['Inbox', 'Thread', 'Settings'],
          description: 'The page the person is looking at',
        },
        selectedThreadIds: {
          type: 'array',
          items: { $ref: '#/$defs/ThreadId' },
        },
      },
      $defs: { ThreadId: { type: 'string' } },
    })
    expect(Object.keys(jsonSchema['properties'] ?? {})).toEqual([
      'page',
      'maybeOpenThreadId',
      'selectedThreadIds',
      'filter',
    ])
  })

  it('exposes the context Schema for Command args and server decoding', () => {
    const context = WorkspaceAgentContext.read(inboxModel)
    const decodeJson = Schema.decodeUnknownSync(
      Schema.toCodecJson(WorkspaceAgentContext.Context),
    )

    expect(decodeJson(WorkspaceAgentContext.encode(context))).toEqual(context)
  })

  it('attaches only the declared context of the current Model to an agent turn', () => {
    Story.story(
      update,
      Story.given(inboxModel),
      Story.message(Message.SubmittedPrompt({ prompt: 'Summarize these' })),
      Story.Command.expectHas(
        SendAgentTurn({
          prompt: 'Summarize these',
          context: {
            page: 'Thread',
            maybeOpenThreadId: Option.some('thread-7'),
            selectedThreadIds: ['thread-7', 'thread-9'],
            filter: 'Unread',
          },
        }),
      ),
      Story.Command.resolve(SendAgentTurn, Message.CompletedSendAgentTurn()),
    )
  })
})

describe('AgentContext in a Subscription', () => {
  beforeEach(() => {
    vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
      Effect.succeed(undefined),
    )
    publishedContexts.length = 0
    const container = document.createElement('div')
    container.id = 'agent-context'
    document.body.append(container)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const clickButton = (name: string): void => {
    const button = Array.from(document.body.querySelectorAll('button')).find(
      element => element.textContent === name,
    )

    if (button === undefined) {
      throw new Error(`No button named ${name}`)
    }

    button.click()
  }

  it('publishes the context at startup and again only when a declared field changes', async () => {
    const container = document.getElementById('agent-context')

    if (container === null) {
      throw new Error('Missing container')
    }

    const handle = embed(
      Program.makeElement({ block: ApplicationBlock, container }),
    )

    try {
      await vi.waitFor(() => {
        expect(publishedContexts).toEqual([encodeModelContext(inboxModel)])
      })

      clickButton('Type')
      clickButton('Type')
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('Unread Private draftxx')
      })

      clickButton('Flagged')
      await vi.waitFor(() => {
        expect(publishedContexts).toEqual([
          encodeModelContext(inboxModel),
          encodeModelContext(
            modifyFields(inboxModel, { filter: () => 'Flagged' }),
          ),
        ])
      })
    } finally {
      handle.dispose()
    }
  })
})
