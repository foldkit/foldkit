import { Effect } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { describe, expect, it } from 'vitest'

import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as Tooltip from '@foldkit/ui/tooltip'

import { ApplicationBlock, DragAndDropBinding } from '../src/application.js'
import {
  ChildDefinition,
  ParentDefinition,
  ParentOutMessage,
  acceptedVariantStory,
} from '../src/bindings.js'
import { acceptedDatePickerScene } from '../src/datePicker.js'
import {
  Definition,
  acceptedScene,
  emptyBody,
  foreignBody,
} from '../src/mounts.js'

const resolveMove = DragAndDrop.test.resolveKeyboardMove({
  binding: DragAndDropBinding,
  itemId: 'card',
  targetContainerId: 'done',
  targetIndex: 1,
})
const dragStory = () =>
  Story.story(
    ApplicationBlock,
    Story.init(),
    Story.messageIn(
      DragAndDropBinding,
      DragAndDrop.DragAndDropBlock.Message.ActivatedKeyboardDrag({
        itemId: 'card',
        containerId: 'todo',
        index: 0,
      }),
    ),
    Story.messageIn(
      DragAndDropBinding,
      DragAndDrop.DragAndDropBlock.Message.PressedArrowKey({
        direction: 'Right',
      }),
    ),
    resolveMove,
  )

describe('published UI leaf contracts', () => {
  it('retains whole-variant operations and explicit descriptor forwarding', async () => {
    await Effect.runPromise(acceptedVariantStory)
  })

  it('rejects a structurally copied unregistered child descriptor for forwarding', () => {
    expect(() =>
      Reflect.apply(ParentDefinition.makeOutMessageForward, undefined, [
        { ...ChildDefinition.contract },
        {
          NotifiedCount: () => ParentOutMessage.ReportedCount({ count: 1 }),
          Dismissed: () => undefined,
        },
      ]),
    ).toThrow('requires a completed child Block')
  })

  it('initializes and renders the public DatePicker through its two child Layers', async () => {
    await Effect.runPromise(acceptedDatePickerScene)
  })

  it('reuses a symbolic Binding matcher with independently acquired implementations', async () => {
    await Effect.runPromise(Effect.all([dragStory(), dragStory()]))
  })

  it('renders the public Tooltip Mount attributes under the actual parent boundary', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.init(),
        Scene.focus(Scene.selector('#tooltip-trigger')),
        Scene.expect(Scene.selector('#tooltip-panel')).toHaveText(
          'Tooltip details',
        ),
        Scene.Mount.resolve(
          Tooltip.test.AnchorTooltip,
          Tooltip.TooltipBlock.Message.CompletedAnchorTooltip(),
        ),
      ),
    )
    await Effect.runPromise(acceptedScene)
  })

  it('rejects erased missing and foreign original published Mount registrations', async () => {
    for (const body of [emptyBody, foreignBody]) {
      const invalid = Reflect.apply(Definition.makeBlock, undefined, [
        Effect.succeed(body),
      ])
      const test = Reflect.apply(Scene.withBlock, undefined, [
        invalid,
        () => undefined,
      ])
      await expect(
        Reflect.apply(Effect.runPromise, undefined, [test]),
      ).rejects.toThrow(
        'Published view Mounts must be original registered Mount Definitions',
      )
    }
  })
})
