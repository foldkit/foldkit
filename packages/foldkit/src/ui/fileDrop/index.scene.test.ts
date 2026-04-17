import { describe, it } from '@effect/vitest'

import { html } from '../../html'
import * as Scene from '../../test/scene'
import type { Message, Model, ViewConfig } from './index'
import { EnteredDragZone, init, update, view } from './index'

const { input, label, p } = html<Message>()

const sceneView =
  (overrides: Partial<ViewConfig<Message>> = {}) =>
  (model: Model) =>
    view({
      model,
      toParentMessage: message => message,
      toView: attrs =>
        label(attrs.root, [
          p([], ['Drop files or click to upload']),
          input(attrs.input),
        ]),
      ...overrides,
    })

const dropZone = Scene.selector('label')
const fileInput = Scene.selector('input[type="file"]')

const initialModel = init({ id: 'uploader' })
const [dragOverModel] = update(initialModel, EnteredDragZone())

describe('FileDrop scene', () => {
  describe('rendering', () => {
    it('renders a label wrapping a hidden file input', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(initialModel),
        Scene.expect(dropZone).toExist(),
        Scene.expect(fileInput).toExist(),
        Scene.expect(fileInput).toHaveAttr('id', 'uploader'),
      )
    })

    it('applies sr-only to the input so it stays hidden visually', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(initialModel),
        Scene.expect(fileInput).toHaveClass('sr-only'),
      )
    })

    it('does not set multiple on the input by default', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(initialModel),
        Scene.expect(fileInput).not.toHaveAttr('multiple'),
      )
    })

    it('sets multiple when ViewConfig.multiple is true', () => {
      Scene.scene(
        { update, view: sceneView({ multiple: true }) },
        Scene.with(initialModel),
        Scene.expect(fileInput).toHaveAttr('multiple'),
      )
    })

    it('sets accept joined by commas when ViewConfig.accept is provided', () => {
      Scene.scene(
        { update, view: sceneView({ accept: ['application/pdf', '.doc'] }) },
        Scene.with(initialModel),
        Scene.expect(fileInput).toHaveAttr('accept', 'application/pdf,.doc'),
      )
    })
  })

  describe('drag state', () => {
    it('does not set data-drag-over initially', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(initialModel),
        Scene.expect(dropZone).not.toHaveAttr('data-drag-over'),
      )
    })

    it('sets data-drag-over on the root after EnteredDragZone', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(dragOverModel),
        Scene.expect(dropZone).toHaveAttr('data-drag-over'),
      )
    })
  })

  describe('disabled state', () => {
    it('sets data-disabled on the root when disabled', () => {
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.with(initialModel),
        Scene.expect(dropZone).toHaveAttr('data-disabled'),
      )
    })

    it('disables the hidden input when disabled', () => {
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.with(initialModel),
        Scene.expect(fileInput).toBeDisabled(),
      )
    })
  })
})
