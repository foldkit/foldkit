import { Context, Effect, Layer, Schema } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { embed } from '../runtime/start.js'
import { Command as StoryCommand, message, model } from '../test/story.js'
import { Block, InstancePath } from './block.js'
import { makeElement } from './program.js'
import { story } from './testing.js'

afterEach(() => {
  document.body.innerHTML = ''
})

class WorkOrderApi extends Context.Service<
  WorkOrderApi,
  { readonly approve: (workOrderId: string) => Effect.Effect<void> }
>()('WorkOrderApi') {}

const ApprovalMessage = defineMessageUnion({
  ClickedApprove: {},
  SucceededSubmitApproval: {},
})

const SubmitApproval = Command.define('SubmitApproval', {
  args: { workOrderId: Schema.String },
  messages: [ApprovalMessage.SucceededSubmitApproval],
})

class ApprovalPanel extends Block<ApprovalPanel>()('ApprovalPanel', {
  Model: Schema.Struct({ status: Schema.Literals(['Pending', 'Approved']) }),
  Message: ApprovalMessage,
  Command: [SubmitApproval],
}) {}

const ApprovalPanelLive = ApprovalPanel.make(
  Effect.fn(function* () {
    return {
      model: { status: 'Pending' },
      update: {
        ClickedApprove: model => ({
          model,
          commands: [SubmitApproval({ workOrderId: 'wo-42' })],
        }),
        SucceededSubmitApproval: () => ({ model: { status: 'Approved' } }),
      },
      view: (model, h) =>
        h.button(
          [h.Id('approve'), h.OnClick(ApprovalPanel.Message.ClickedApprove())],
          [model.status],
        ),
    }
  }),
)

const approved: Array<string> = []

const ApprovalHandlersLive = ApprovalPanel.handlers(
  Effect.fn(function* () {
    const api = yield* WorkOrderApi

    return {
      SubmitApproval: ({ workOrderId }) =>
        api
          .approve(workOrderId)
          .pipe(Effect.as(ApprovalPanel.Message.SucceededSubmitApproval())),
    }
  }),
)

const WorkOrderApiTest = Layer.succeed(WorkOrderApi, {
  approve: workOrderId => Effect.sync(() => approved.push(workOrderId)),
})

class WorkOrdersPage extends Block<WorkOrdersPage>()('WorkOrdersPage', {
  Model: Schema.Struct({ approval: ApprovalPanel }),
}) {}

const WorkOrdersPageLive = WorkOrdersPage.make(
  Effect.fn(function* () {
    const approval = yield* new ApprovalPanel('approval')
    return { model: { approval }, view: model => model.approval.view() }
  }),
)

describe('Block handlers', () => {
  it('runs Command handlers from the handlers Layer', async () => {
    approved.length = 0
    const container = document.createElement('div')
    container.id = 'work-orders'
    document.body.append(container)
    const handle = embed(
      makeElement(WorkOrdersPage, {
        container,
        layer: WorkOrdersPageLive.pipe(
          Layer.provide(ApprovalPanelLive),
          Layer.provide(ApprovalHandlersLive),
          Layer.provide(WorkOrderApiTest),
        ),
        devTools: false,
      }),
    )

    await vi.waitFor(() =>
      expect(document.getElementById('approve')).not.toBe(null),
    )
    document.getElementById('approve')?.click()
    await vi.waitFor(() =>
      expect(document.getElementById('approve')?.textContent).toBe('Approved'),
    )
    expect(approved).toEqual(['wo-42'])

    handle.dispose()
  })

  it('runs a story without the handlers Layer or its services', () =>
    Effect.runPromise(
      story(
        ApprovalPanelLive,
        message(ApprovalPanel.Message.ClickedApprove()),
        StoryCommand.resolve(
          SubmitApproval({ workOrderId: 'wo-42' }),
          ApprovalPanel.Message.SucceededSubmitApproval(),
        ),
        model(panel => expect(panel.status).toBe('Approved')),
      ),
    ))

  it('requires the handlers Layer in a program', () => {
    // @ts-expect-error ApprovalPanelLive requires Handlers<ApprovalPanel>
    const unhandled: Layer.Layer<ApprovalPanel> = ApprovalPanelLive // oxlint-disable-line effecttsgo/missing-layer-context
    const handled: Layer.Layer<ApprovalPanel, never, WorkOrderApi> =
      ApprovalPanelLive.pipe(Layer.provide(ApprovalHandlersLive))
    expect([unhandled, handled].every(Layer.isLayer)).toBe(true)
  })
})

describe('Block stories', () => {
  it('names a child Block whose Layer is missing', () => {
    // @ts-expect-error MissingBlockLayer<ApprovalPanel>
    const missing: Effect.Effect<void> = story(WorkOrdersPageLive)
    const provided: Effect.Effect<void> = story(
      WorkOrdersPageLive.pipe(Layer.provide(ApprovalPanelLive)),
      model(page => expect(page.approval.status).toBe('Pending')),
    )
    expect([missing, provided].every(Effect.isEffect)).toBe(true)
  })
})

class Ticker extends Block<Ticker>()('Ticker', {
  Model: Schema.Struct({ commandIdPrefix: Schema.String }),
}) {}

const TickerLive = Ticker.make(
  Effect.fn(function* () {
    const path = yield* InstancePath
    return { model: { commandIdPrefix: path.join('/') } }
  }),
)

class Tickers extends Block<Tickers>()('Tickers', {
  Model: Schema.Struct({ ticker: Ticker, tickers: Schema.Array(Ticker) }),
  Message: defineMessageUnion({ ClickedAdd: {} }),
}) {}

const TickersLive = Tickers.make(
  Effect.fn(function* () {
    const ticker = yield* new Ticker('ticker')
    const row = yield* Ticker.each('tickers')
    return {
      model: { ticker, tickers: [] },
      update: {
        ClickedAdd: model => ({
          model: { ...model, tickers: [...model.tickers, row('wo-42')] },
        }),
      },
    }
  }),
).pipe(Layer.provide(TickerLive))

describe('Block InstancePath', () => {
  it('gives a constructor its path from the root', () =>
    Effect.runPromise(
      story(
        TickersLive,
        message(Tickers.Message.ClickedAdd()),
        model(tickers => {
          expect(tickers.ticker.commandIdPrefix).toBe('ticker')
          expect(tickers.tickers.map(row => row.commandIdPrefix)).toEqual([
            'tickers/wo-42',
          ])
        }),
      ),
    ))
})
