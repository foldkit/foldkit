import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import * as Scene from 'foldkit/scene'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  AnchorPopover,
  Message,
  Popover,
  PopoverLive,
  PortalPopoverBackdrop,
  type ViewInput,
  arrowId,
  buttonId,
} from './block.js'

type Overrides = Omit<Partial<ViewInput>, 'toView' | 'anchor'>

type PopoverSceneArgs = Readonly<{
  contentFocus?: boolean
  overrides?: Overrides
}>

class PopoverScene extends Block<PopoverScene, PopoverSceneArgs>()(
  'PopoverScene',
  { Model: Schema.Struct({ popover: Popover }) },
) {}

const PopoverSceneLive = PopoverScene.make(
  Effect.fn(function* (_id, { contentFocus = false, overrides = {} }) {
    const popover = yield* new Popover('popover', { id: 'test', contentFocus })

    return {
      model: { popover },
      view: (model, h) =>
        model.popover.view({
          anchor: { placement: 'bottom-start' },
          toView: ({ button, panel, backdrop, arrow, isVisible }) =>
            h.div(
              [],
              [
                h.keyed('button')('test-button', [...button]),
                ...(isVisible
                  ? [
                      h.keyed('div')('test-backdrop', [...backdrop]),
                      h.keyed('div')(
                        'test-panel-container',
                        [...panel],
                        [h.keyed('div')('test-arrow', [...arrow])],
                      ),
                    ]
                  : []),
              ],
            ),
          ...overrides,
        }),
    }
  }),
).pipe(Layer.provide(PopoverLive))

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorPopover,
  Message.CompletedAnchorPopover(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalPopoverBackdrop,
  Message.CompletedPortalPopoverBackdrop(),
)

const button = Scene.selector('[key="test-button"]')
const panel = Scene.selector('[key="test-panel-container"]')
const backdrop = Scene.selector('[key="test-backdrop"]')
const arrow = Scene.selector('[key="test-arrow"]')

const openModel = (contentFocus: boolean): Resolved<PopoverScene> => ({
  popover: {
    id: 'test',
    isOpen: true,
    isAnimated: false,
    isModal: false,
    contentFocus,
    animation: {
      id: 'test-panel',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeLastButtonPointerType: Option.none(),
  },
})

const openPopover = Scene.given(openModel(false))
const openContentFocusPopover = Scene.given(openModel(true))

describe('Popover', () => {
  describe('view', () => {
    it.effect('renders button with aria-expanded false when closed', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        Scene.expect(button).toHaveAttr('aria-expanded', 'false'),
        Scene.expect(button).not.toHaveAttr('aria-controls'),
      ),
    )

    it.effect('renders button with aria-expanded true when open', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
        Scene.expect(button).toHaveAttr('aria-controls', 'test-panel'),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('renders panel when open', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        Scene.expect(panel).toExist(),
        Scene.expect(panel).toHaveAttr('tabIndex', '0'),
        Scene.expect(panel).toHaveHandler('focusout'),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('closes when focus leaves the panel', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        acknowledgeAnchor,
        acknowledgeBackdrop,
        Scene.focusLeave(panel),
        Scene.expect(panel).toBeAbsent(),
        Scene.expect(button).toHaveAttr('aria-expanded', 'false'),
        Scene.Mount.expectEnded(AnchorPopover, PortalPopoverBackdrop),
      ),
    )

    it.effect('does not render panel when closed', () =>
      Scene.scene(PopoverSceneLive, {}, Scene.expect(panel).toBeAbsent()),
    )

    it.effect('renders backdrop when open', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        Scene.expect(backdrop).toExist(),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('does not have aria-haspopup on the button', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        Scene.expect(button).toExist(),
        Scene.expect(button).not.toHaveAttr('aria-haspopup'),
      ),
    )

    it.effect('does not have role on the panel', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        Scene.expect(panel).toExist(),
        Scene.expect(panel).not.toHaveAttr('role'),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('adds anchor positioning styles and hooks', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        Scene.expect(panel).toHaveStyle('position', 'absolute'),
        Scene.expect(panel).toHaveStyle('margin', '0'),
        Scene.expect(panel).toHaveStyle('visibility', 'hidden'),
        Scene.expect(panel).toHaveHook('insert'),
        Scene.expect(panel).toHaveHook('destroy'),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('emits the derived id and aria-hidden on the arrow', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        Scene.expect(arrow).toHaveAttr('id', 'test-arrow'),
        Scene.expect(arrow).toHaveAttr('aria-hidden', 'true'),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('passes the arrow id to the anchor Mount', () =>
      Scene.scene(
        PopoverSceneLive,
        {},
        openPopover,
        Scene.Mount.expectHas(
          AnchorPopover({
            buttonId: 'test-button',
            anchor: { placement: 'bottom-start' },
            arrowId: 'test-arrow',
          }),
        ),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('passes the arrow padding to the anchor Mount when given', () =>
      Scene.scene(
        PopoverSceneLive,
        { overrides: { arrowPadding: 8 } },
        openPopover,
        Scene.Mount.expectHas(
          AnchorPopover({
            buttonId: 'test-button',
            anchor: { placement: 'bottom-start' },
            arrowId: 'test-arrow',
            arrowPadding: 8,
          }),
        ),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    describe('contentFocus mode', () => {
      it.effect(
        'renders panel without tabindex when contentFocus is enabled',
        () =>
          Scene.scene(
            PopoverSceneLive,
            { contentFocus: true },
            openContentFocusPopover,
            Scene.expect(panel).toExist(),
            Scene.expect(panel).not.toHaveAttr('tabIndex'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect(
        'renders panel without a focus-leave handler when contentFocus is enabled',
        () =>
          Scene.scene(
            PopoverSceneLive,
            { contentFocus: true },
            openContentFocusPopover,
            Scene.expect(panel).not.toHaveHandler('focusout'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect(
        'keeps the panel keydown handler when contentFocus is enabled',
        () =>
          Scene.scene(
            PopoverSceneLive,
            { contentFocus: true },
            openContentFocusPopover,
            Scene.expect(panel).toHaveHandler('keydown'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )
    })

    describe('button labeling', () => {
      it.effect(
        'no aria-label or aria-labelledby on the button by default',
        () =>
          Scene.scene(
            PopoverSceneLive,
            {},
            Scene.expect(button).not.toHaveAttr('aria-label'),
            Scene.expect(button).not.toHaveAttr('aria-labelledby'),
          ),
      )

      it.effect(
        'applies aria-label to the button when ariaLabel is provided',
        () =>
          Scene.scene(
            PopoverSceneLive,
            { overrides: { ariaLabel: 'Options' } },
            Scene.expect(button).toHaveAttr('aria-label', 'Options'),
            Scene.expect(button).not.toHaveAttr('aria-labelledby'),
          ),
      )

      it.effect(
        'applies aria-labelledby to the button when ariaLabelledBy is provided',
        () =>
          Scene.scene(
            PopoverSceneLive,
            { overrides: { ariaLabelledBy: 'options-label' } },
            Scene.expect(button).toHaveAttr('aria-labelledby', 'options-label'),
            Scene.expect(button).not.toHaveAttr('aria-label'),
          ),
      )

      it.effect(
        'prefers aria-label over aria-labelledby when both are provided',
        () =>
          Scene.scene(
            PopoverSceneLive,
            {
              overrides: {
                ariaLabel: 'Options',
                ariaLabelledBy: 'options-label',
              },
            },
            Scene.expect(button).toHaveAttr('aria-label', 'Options'),
            Scene.expect(button).not.toHaveAttr('aria-labelledby'),
          ),
      )

      it('buttonId derives the trigger id from the base id', () => {
        expect(buttonId('test')).toBe('test-button')
      })

      it('arrowId derives the arrow id from the base id', () => {
        expect(arrowId('test')).toBe('test-arrow')
      })
    })
  })
})
