import { Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, it, vi } from 'vitest'

import { PopoverBlock } from './block.js'

const PORTAL_ROOT_ID = 'foldkit-portal-root'
const POPOVER_ID = 'sort'

const Model = Schema.Struct({ popover: PopoverBlock.Model })
const PopoverModalReopenTestDefinition = Block.makeDefinition(
  'PopoverModalReopenTest',
  {
    Model,
    Message: Schema.Never,
  },
)
const foldPopoverOutMessage =
  PopoverModalReopenTestDefinition.makeOutMessageFold(PopoverBlock, {
    Opened: () => PopoverModalReopenTestDefinition.makeNoopStep(),
    Closed: () => PopoverModalReopenTestDefinition.makeNoopStep(),
  })
const PopoverBinding = PopoverModalReopenTestDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popover',
    init: false,
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })
const PopoverModalReopenTestComposition =
  PopoverModalReopenTestDefinition.makeComposition({
    bindings: [PopoverBinding],
  })
const view = PopoverModalReopenTestComposition.makeView((model, h) =>
  h.main(
    [h.Id('page')],
    [
      h.block(
        PopoverBinding.embedView({
          slotId: 'popover',
          model: model.popover,
          viewInputs: {
            anchor: { placement: 'bottom-start' },
            toView: ({ button, panel, backdrop, isVisible }) =>
              h.div(
                [],
                [
                  h.button([...button], ['Sort']),
                  ...(isVisible
                    ? [
                        h.div([...backdrop]),
                        h.div(
                          [...panel],
                          [
                            h.button(
                              [h.Id('item'), h.Type('button')],
                              ['Name'],
                            ),
                          ],
                        ),
                      ]
                    : []),
                ],
              ),
          },
        }),
      ),
    ],
  ),
)
const prepare = () =>
  PopoverModalReopenTestComposition.prepareBlock({
    init: PopoverModalReopenTestComposition.makeInit(() =>
      PopoverBinding.init({
        args: [{ id: POPOVER_ID, isModal: true }],
        toParentModel: popover => ({ popover }),
      }),
    ),
    update: PopoverModalReopenTestComposition.makeUpdate({}),
    view,
  })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const findInertAncestor = (element: Element | null): Option.Option<Element> => {
  for (
    let node = element?.parentElement ?? null;
    node !== null;
    node = node.parentElement
  ) {
    if (node.inert || node.hasAttribute('inert')) {
      return Option.some(node)
    }
  }

  return Option.none()
}

afterEach(() => {
  document.body.replaceChildren()
  document.documentElement.style.overflow = ''
})

it('keeps a modal Popover panel usable on the second open', async () => {
  const container = document.createElement('div')
  container.id = 'app'
  document.body.append(container)
  const handle = Runtime.embed(
    Program.makeElement({ block: ApplicationBlock, container }),
  )
  const button = () => document.getElementById(`${POPOVER_ID}-button`)
  const panel = () => document.getElementById(`${POPOVER_ID}-panel`)

  try {
    await vi.waitFor(() => expect(button()).not.toBeNull())

    button()?.click()
    await vi.waitFor(() =>
      expect(panel()?.parentElement?.id).toBe(PORTAL_ROOT_ID),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[inert]')).not.toBeNull(),
    )
    await vi.waitFor(() =>
      expect(document.activeElement?.id).toBe(`${POPOVER_ID}-panel`),
    )
    expect(findInertAncestor(panel())).toEqual(Option.none())
    expect(document.getElementById(PORTAL_ROOT_ID)?.inert).toBe(false)

    button()?.click()
    await vi.waitFor(() => expect(panel()).toBeNull())
    await vi.waitFor(() => expect(document.querySelector('[inert]')).toBeNull())

    button()?.click()
    await vi.waitFor(() =>
      expect(panel()?.parentElement?.id).toBe(PORTAL_ROOT_ID),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[inert]')).not.toBeNull(),
    )
    await vi.waitFor(() =>
      expect(document.activeElement?.id).toBe(`${POPOVER_ID}-panel`),
    )
    expect(findInertAncestor(panel())).toEqual(Option.none())
    expect(document.getElementById(PORTAL_ROOT_ID)?.inert).toBe(false)
  } finally {
    handle.dispose()
  }
})
