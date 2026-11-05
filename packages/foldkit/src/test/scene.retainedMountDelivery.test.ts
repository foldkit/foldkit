import { Array, Effect } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Scene from '../scene/public.js'
import { modifyFields } from '../struct/public.js'
import * as Application from './apps/retainedMountDelivery/application.js'
import * as Surface from './apps/retainedMountDelivery/surface.js'
import * as Workspace from './apps/retainedMountDelivery/workspace.js'

const firstMount = Surface.ObserveSurface({ label: 'first' })
const measured = (width: number) => Surface.Message.MeasuredSurface({ width })
const click = (id: string) => Scene.click(Scene.selector(`#${id}`))
const text = (value: string) =>
  Scene.expect(Scene.selector('#summary')).toHaveText(value)

const giveWithoutRender =
  <Model>(removed: Model, restored: Model) =>
  <Message, OutMessage>(
    simulation: Scene.SceneSimulation<Model, Message, OutMessage>,
  ) =>
    Scene.given(restored)(Scene.given(removed)(simulation))

const replaceOwnerAndEmit = <Model, Message, OutMessage>(
  simulation: Scene.SceneSimulation<Model, Message, OutMessage>,
) =>
  Scene.Mount.emit(
    firstMount,
    measured(700),
  )(
    Scene.Mount.expectEnded(firstMount)(
      Scene.Command.resolveAll(
        [Application.RemoveOwner, Application.completedRemove],
        [Application.RecreateOwner, Application.completedRecreate],
      )(simulation),
    ),
  )

for (const form of ['nested', 'published'] satisfies ReadonlyArray<
  'nested' | 'published'
>) {
  const subject = {
    block: Application.ApplicationBlock,
    layer: Application.layer,
    viewInputs: { form },
  }
  describe(`retained ${form} Mount delivery`, () => {
    test('delivers later results to the current boundary without reacquiring', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          Scene.Mount.expectNone(),
          Scene.Mount.emit(firstMount, measured(700)),
          text('first:100:first,second:700:second'),
        ),
      )
    })
    test('delivers the first result through the current boundary', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(true),
          Scene.Command.resolve(
            Application.WaitForSelection,
            Application.completedSelection,
          ),
          Scene.Mount.expectExact(firstMount),
          Scene.Mount.resolve(firstMount, measured(650)),
          text('first:0:first,second:650:second'),
          Scene.Mount.emit(firstMount, measured(700)),
          text('first:0:first,second:700:second'),
        ),
      )
    })
    test('preserves original args, name and registration across omission and same-owner restoration', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('omit'),
          Scene.Mount.emit(firstMount, measured(700)),
          click('rename'),
          click('restore'),
          Scene.Mount.expectNone(),
          Scene.Mount.emit(firstMount, measured(140)),
          text('first:140:renamed,second:600:second'),
        ),
      )
    })
    test('ends the acquiring occurrence even while its element is retained', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          click('remove'),
          Scene.Mount.expectEnded(firstMount),
          click('recreate'),
          Scene.Mount.expectNone(),
          text('second:600:second,first:600:recreated'),
        ),
      )
    })
    test('rejects an old emission after removal and key reuse before rendering', async () => {
      await expect(
        Effect.runPromise(
          Scene.scene(
            subject,
            Scene.init(false),
            Scene.Mount.resolve(firstMount, measured(100)),
            click('second'),
            click('batch'),
            replaceOwnerAndEmit,
          ),
        ),
      ).rejects.toThrow('selected no resolved active Mount')
    })
    test('observes removal and recreation within one Command result batch', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          click('batch'),
          Scene.Command.resolveAll(
            [Application.RemoveOwner, Application.completedRemove],
            [Application.RecreateOwner, Application.completedRecreate],
          ),
          Scene.Mount.expectEnded(firstMount),
          Scene.Mount.expectNone(),
          text('second:600:second,first:600:recreated'),
        ),
      )
    })
    test('retains returned Commands and OutMessages without double lifting', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          Scene.Mount.emit(firstMount, measured(777)),
          Scene.expectOutMessage(
            Application.OutMessage.MeasuredSurface({ width: 777 }),
          ),
          Scene.Command.expectExact(Surface.ReportMeasurement),
          Scene.Command.resolve(
            Surface.ReportMeasurement,
            Surface.Message.CompletedReportMeasurement(),
          ),
          text('first:100:first,second:777:second'),
        ),
      )
    })
    test('observes every result in an exact Command batch', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          click('batch'),
          Scene.Command.resolveAllExact(
            [Application.RemoveOwner, Application.completedRemove],
            [Application.RecreateOwner, Application.completedRecreate],
          ),
          Scene.Mount.expectEnded(firstMount),
          Scene.Mount.expectNone(),
        ),
      )
    })
    test('observes both bubbling Messages before the next render', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          click('replace-in-one-click'),
          Scene.Mount.expectEnded(firstMount),
          Scene.Mount.expectNone(),
          text('second:600:second,first:600:recreated'),
        ),
      )
    })
    test('observes direct InMessage results', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          Scene.inMessage(
            Application.ApplicationBlock.InMessage.RequestedRemove(),
          ),
          Scene.Mount.expectEnded(firstMount),
          Scene.inMessage(
            Application.ApplicationBlock.InMessage.RequestedRecreate(),
          ),
          Scene.Mount.expectNone(),
        ),
      )
    })
    test('observes given assignments composed without rendering between them', async () => {
      const removed = modifyFields(Application.initialModel, {
        surfaces: Array.filter(item => item.key !== 'first'),
      })
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.given(Application.initialModel),
          Scene.Mount.resolve(firstMount, measured(100)),
          giveWithoutRender(removed, Application.initialModel),
          Scene.Mount.expectEnded(firstMount),
          Scene.Mount.expectExact(firstMount),
          Scene.Mount.resolve(firstMount, measured(100)),
          Scene.Mount.expectNone(),
        ),
      )
    })
    test('observes every Mount result before selecting the next result', async () => {
      await Effect.runPromise(
        Scene.scene(
          { ...subject, viewInputs: { form, mode: 'RetireDuringMounts' } },
          Scene.init(false),
          Scene.Mount.resolveAll(
            [
              Application.RemoveMountedOwner,
              Application.ApplicationBlock.Message.CompletedRemoveMountedOwner(),
            ],
            [
              Application.RecreateMountedOwner,
              Application.ApplicationBlock.Message.CompletedRecreateMountedOwner(),
            ],
          ),
          Scene.Mount.expectEnded(firstMount),
          Scene.Mount.expectNone(),
        ),
      )
    })
    test('rejects a pending Mount retired by an earlier result in the same batch', async () => {
      await expect(
        Effect.runPromise(
          Scene.scene(
            { ...subject, viewInputs: { form, mode: 'RetireDuringMounts' } },
            Scene.init(false),
            Scene.Mount.resolveAll(
              [
                Application.RemoveMountedOwner,
                Application.ApplicationBlock.Message.CompletedRemoveMountedOwner(),
              ],
              [firstMount, measured(100)],
            ),
          ),
        ),
      ).rejects.toThrow("wasn't in the pending Mounts")
    })
    test.each(['Lazy', 'Cached'] satisfies ReadonlyArray<'Lazy' | 'Cached'>)(
      'retains current boundary delivery through %s VNodes',
      async mode => {
        await Effect.runPromise(
          Scene.scene(
            { ...subject, viewInputs: { form, mode } },
            Scene.init(false),
            Scene.Mount.resolve(firstMount, measured(100)),
            click('second'),
            text('first:100:first,second:600:second'),
            Scene.Mount.expectNone(),
            Scene.Mount.emit(firstMount, measured(700)),
            text('first:100:first,second:700:second'),
          ),
        )
      },
    )
    test('detects duplicate slot ids within one render', async () => {
      await expect(
        Effect.runPromise(
          Scene.scene(
            { ...subject, viewInputs: { form, mode: 'Duplicate' } },
            Scene.init(false),
          ),
        ),
      ).rejects.toThrow('duplicate h.block slotId')
    })
    test('rejects replacement args while preserving the original stream registration', async () => {
      await expect(
        Effect.runPromise(
          Scene.scene(
            subject,
            Scene.init(false),
            Scene.Mount.resolve(firstMount, measured(100)),
            click('rename'),
            Scene.Mount.emit(
              Surface.ObserveSurface({ label: 'renamed' }),
              measured(200),
            ),
          ),
        ),
      ).rejects.toThrow('selected no resolved active Mount')
    })
    test('lifts through an ancestor boundary exactly once', async () => {
      await Effect.runPromise(
        Scene.scene(
          {
            block: Workspace.WorkspaceBlock,
            layer: Workspace.layer,
            viewInputs: { form },
          },
          Scene.init(),
          Scene.Mount.resolve(firstMount, measured(100)),
          click('second'),
          Scene.Mount.emit(firstMount, measured(777)),
          Scene.expectOutMessage(
            Application.OutMessage.MeasuredSurface({ width: 777 }),
          ),
          Scene.Command.resolve(
            Surface.ReportMeasurement,
            Surface.Message.CompletedReportMeasurement(),
          ),
          text('first:100:first,second:777:second'),
        ),
      )
    })
    test('keeps Commands and OutMessages from a delayed first Mount result', async () => {
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(true),
          Scene.Command.resolve(
            Application.WaitForSelection,
            Application.completedSelection,
          ),
          Scene.Mount.resolve(firstMount, measured(777)),
          Scene.expectOutMessage(
            Application.OutMessage.MeasuredSurface({ width: 777 }),
          ),
          Scene.Command.resolve(
            Surface.ReportMeasurement,
            Surface.Message.CompletedReportMeasurement(),
          ),
          text('first:0:first,second:777:second'),
        ),
      )
    })
    test('does not build or start handlers', async () => {
      Surface.handlerLog.length = 0
      await Effect.runPromise(
        Scene.scene(
          subject,
          Scene.init(false),
          Scene.Mount.resolve(firstMount, measured(100)),
        ),
      )
      expect(Surface.handlerLog).toEqual([])
    })
  })
}

test('a retired occurrence invalidates a lazy boundary even with identical view arguments', async () => {
  const removed = modifyFields(Application.initialModel, {
    surfaces: Array.filter(item => item.key !== 'first'),
  })
  await Effect.runPromise(
    Scene.scene(
      {
        block: Application.ApplicationBlock,
        layer: Application.layer,
        viewInputs: { form: 'nested', mode: 'Lazy' },
      },
      Scene.given(Application.initialModel),
      Scene.Mount.resolve(firstMount, measured(0)),
      Scene.given(Application.initialModel),
      giveWithoutRender(removed, Application.initialModel),
      Scene.Mount.expectEnded(firstMount),
      Scene.Mount.expectExact(firstMount),
      Scene.Mount.resolve(firstMount, measured(0)),
      Scene.Mount.expectNone(),
      click('surface'),
      text('first:222:first,second:600:second'),
    ),
  )
})
