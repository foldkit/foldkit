import { Effect } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Scene from '../scene/public.js'
import * as Application from './apps/retainedMountDelivery/application.js'
import * as Surface from './apps/retainedMountDelivery/surface.js'

const firstMount = Surface.ObserveSurface({ label: 'first' })
const measured = (width: number) => Surface.Message.MeasuredSurface({ width })
const click = (id: string) => Scene.click(Scene.selector(`#${id}`))
const text = (value: string) =>
  Scene.expect(Scene.selector('#summary')).toHaveText(value)

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
    test('preserves original args across omission, rename and same-owner restoration', async () => {
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
    test('rejects an old emission after removal and key reuse', async () => {
      await expect(
        Effect.runPromise(
          Scene.scene(
            subject,
            Scene.init(false),
            Scene.Mount.resolve(firstMount, measured(100)),
            click('second'),
            click('remove'),
            Scene.Mount.expectEnded(firstMount),
            click('recreate'),
            Scene.Mount.emit(firstMount, measured(700)),
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
