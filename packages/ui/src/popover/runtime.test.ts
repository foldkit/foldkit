import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PopoverBlock } from './block.js'

const popoverId = 'badge-popover'
const portalRootId = 'foldkit-portal-root'

const Model = Schema.Struct({
  popover: PopoverBlock.Model,
  isBadgeShown: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedToggleBadge: {},
})

const PopoverSiblingRuntimeTestDefinition = Block.makeDefinition(
  'PopoverSiblingRuntimeTest',
  {
    Model,
    Message,
  },
)

const foldPopoverOutMessage =
  PopoverSiblingRuntimeTestDefinition.makeOutMessageFold(PopoverBlock, {
    Opened: () => PopoverSiblingRuntimeTestDefinition.makeNoopStep(),
    Closed: () => PopoverSiblingRuntimeTestDefinition.makeNoopStep(),
  })

const PopoverBinding = PopoverSiblingRuntimeTestDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popover',
    init: false,
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

const PopoverSiblingRuntimeTestComposition =
  PopoverSiblingRuntimeTestDefinition.makeComposition({
    bindings: [PopoverBinding],
  })

const update = PopoverSiblingRuntimeTestComposition.makeUpdate({
  ClickedToggleBadge: model => ({
    model: modifyFields(model, { isBadgeShown: isShown => !isShown }),
  }),
})

const view = PopoverSiblingRuntimeTestComposition.makeView((model, h) =>
  h.main(
    [],
    [
      h.button(
        [h.Id('toggle-badge'), h.OnClick(Message.ClickedToggleBadge())],
        ['Toggle badge'],
      ),
      h.block(
        PopoverBinding.embedView({
          slotId: popoverId,
          model: model.popover,
          viewInputs: {
            anchor: { placement: 'bottom-start' },
            toView: ({ button, panel, isVisible }) =>
              h.div(
                [h.Id('wrapper')],
                [
                  h.button([...button], ['Open']),
                  ...(model.isBadgeShown
                    ? [h.span([h.Id('badge')], ['!'])]
                    : []),
                  ...(isVisible ? [h.div([...panel], ['Panel content'])] : []),
                ],
              ),
          },
        }),
      ),
    ],
  ),
)

const prepare = () =>
  PopoverSiblingRuntimeTestComposition.prepareBlock({
    init: PopoverSiblingRuntimeTestComposition.makeInit(() =>
      PopoverBinding.init({
        args: [{ id: popoverId }],
        toParentModel: popover => ({ popover, isBadgeShown: false }),
      }),
    ),
    update,
    view,
  })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

describe('Popover with a portaled panel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders a sibling that appears before the open panel', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.id = 'badge-popover-app'
    document.body.append(container)
    const handle = Runtime.embed(
      Program.makeElement({ block: ApplicationBlock, container }),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(`${popoverId}-button`)).not.toBeNull()
      })
      document.getElementById(`${popoverId}-button`)?.click()

      await vi.waitFor(() => {
        expect(
          document.getElementById(`${popoverId}-panel`)?.parentElement?.id,
        ).toBe(portalRootId)
      })
      document.getElementById('toggle-badge')?.click()

      await vi.waitFor(() => {
        expect(document.getElementById('badge')?.parentElement?.id).toBe(
          'wrapper',
        )
      })
      expect(
        document.getElementById(`${popoverId}-panel`)?.parentElement?.id,
      ).toBe(portalRootId)
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      handle.dispose()
    }
  })
})
