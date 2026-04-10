import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'

import * as Scene from '../../test/scene'
import type { Message, Model, ViewConfig } from './index'
import { Opened, init, update, view } from './index'

const sceneView =
  (
    overrides: Omit<
      Partial<ViewConfig<Message>>,
      'model' | 'toParentMessage'
    > = {},
  ) =>
  (model: Model) =>
    view({
      anchor: { placement: 'bottom-start' },
      buttonContent: Effect.succeed(null),
      panelContent: Effect.succeed(null),
      ...overrides,
      model,
      toParentMessage: message => message,
    })

const button = Scene.selector('[key="test-button"]')
const panel = Scene.selector('[key="test-panel-container"]')
const backdrop = Scene.selector('[key="test-backdrop"]')

const closedModel = init({ id: 'test' })
const [openModel] = update(init({ id: 'test' }), Opened())

describe('Popover', () => {
  describe('view', () => {
    it('renders button with aria-expanded false when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel),
        Scene.expect(button).toHaveAttr('aria-expanded', 'false'),
        Scene.expect(button).toHaveAttr('aria-controls', 'test-panel'),
      )
    })

    it('renders button with aria-expanded true when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
      )
    })

    it('renders panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).toExist(),
        Scene.expect(panel).toHaveAttr('tabIndex', '0'),
      )
    })

    it('does not render panel when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel),
        Scene.expect(panel).toBeAbsent(),
      )
    })

    it('renders backdrop when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(backdrop).toExist(),
      )
    })

    it('does not have aria-haspopup on the button', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel),
        Scene.expect(button).toExist(),
        Scene.expect(button).not.toHaveAttr('aria-haspopup'),
      )
    })

    it('does not have role on the panel', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).toExist(),
        Scene.expect(panel).not.toHaveAttr('role'),
      )
    })

    it('adds anchor positioning styles and hooks', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).toHaveStyle('position', 'absolute'),
        Scene.expect(panel).toHaveStyle('margin', '0'),
        Scene.expect(panel).toHaveStyle('visibility', 'hidden'),
        Scene.expect(panel).toHaveHook('insert'),
        Scene.expect(panel).toHaveHook('destroy'),
      )
    })
  })
})
