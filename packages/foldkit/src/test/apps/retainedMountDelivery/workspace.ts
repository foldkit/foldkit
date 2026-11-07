import { Effect, Layer, Schema } from 'effect'

import * as Block from '../../../block/public.js'
import * as Application from './application.js'

const Model = Schema.Struct({ application: Application.ApplicationBlock.Model })
type Model = typeof Model.Type
export const WorkspaceKey = Symbol('Workspace')
export const WorkspaceBlock = Block.make('Workspace', {
  key: WorkspaceKey,
  Model,
  Message: Schema.Never,
  OutMessage: Application.OutMessage,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: 'Element',
    Inputs: Schema.Struct({ form: Schema.Literals(['nested', 'published']) }),
  },
})
const ApplicationBinding = WorkspaceBlock.makeRequiredFieldBinding(
  Application.ApplicationBlock,
  { field: 'application', init: { contextToArgs: () => [false] } },
).withOutMessagePolicy({
  forward: WorkspaceBlock.makeOutMessageForward(Application.ApplicationBlock, {
    MeasuredSurface: ({ width }) =>
      Application.OutMessage.MeasuredSurface({ width }),
  }),
})
const WorkspaceComposition = WorkspaceBlock.makeComposition({
  bindings: [ApplicationBinding],
})
export const layer = WorkspaceBlock.makeLayer(
  Effect.gen(function* () {
    const application = yield* ApplicationBinding

    return {
      children: [application],
      init: WorkspaceComposition.makeInit(() => ({ model: {} })),
      update: WorkspaceComposition.makeUpdate({}),
      view: WorkspaceComposition.makeView.withInputs((model, viewInputs, h) =>
        h.section(
          [],
          [
            h.block(
              ApplicationBinding.embedView({
                slotId: 'application',
                model: model.application,
                viewInputs,
              }),
            ),
          ],
        ),
      ),
    }
  }),
).pipe(Layer.provide(Application.layer))
