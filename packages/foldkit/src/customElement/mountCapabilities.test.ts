import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { __htmlBuilder, childAttributes } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import * as Application from '../runtime/application.js'
import * as CustomElement from './index.js'

const Message = defineMessageUnion({
  ActivatedWidget: {},
  CompletedAnchorWidget: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({})
type Model = typeof Model.Type

const AnchorWidget = Mount.define('AnchorCustomElementWidget', {
  messages: [Message.CompletedAnchorWidget],
})

const Widget = CustomElement.define({
  tag: 'mount-capability-widget',
  properties: { label: Schema.String },
  events: { activated: Schema.Struct({}) },
})

type MountRequirements = Mount.RequirementsOf<typeof AnchorWidget>
type MountedWidgetBuilder = CustomElement.Builder<
  typeof Widget,
  Message,
  MountRequirements
>

const update = (model: Model, _message: Message) => ({ model })

const mountedChildAttributes = () => {
  const h = __htmlBuilder<Message, MountRequirements>()
  return childAttributes([h.OnMount(AnchorWidget())])
}

describe('CustomElement Mount capabilities', () => {
  it('preserves registered requirements through the builder and ChildAttributes', () => {
    const acceptsMountedBuilder = (_builder: MountedWidgetBuilder): void => {}
    const renderRegistered = () =>
      Application.__makeFromConfig({
        Model,
        init: () => ({ model: Model.make({}) }),
        update,
        view: (_model, h) => {
          const widget = Widget.withMessage(h)
          acceptsMountedBuilder(widget)

          return {
            title: 'registered CustomElement Mount',
            body: widget([
              widget.Label('Mounted'),
              widget.OnActivated(() => Message.ActivatedWidget()),
              h.OnMount(AnchorWidget()),
              ...mountedChildAttributes(),
            ]),
          }
        },
        mounts: [AnchorWidget],
        container: document.createElement('div'),
      })

    expect(renderRegistered).toBeTypeOf('function')
  })

  it('rejects Mount attributes when the registry omits their definition', () => {
    const renderMissingRegistration = () =>
      Application.__makeFromConfig({
        Model,
        init: () => ({ model: Model.make({}) }),
        update,
        view: (_model, h) => {
          const widget = Widget.withMessage(h)

          return {
            title: 'missing CustomElement Mount registration',
            body: widget([
              // @ts-expect-error The CustomElement builder has no registered Mount capability.
              {
                _tag: 'OnMount',
                action: AnchorWidget(),
              },
            ]),
          }
        },
        container: document.createElement('div'),
      })

    const renderMissingChildRegistration = () =>
      Application.__makeFromConfig({
        Model,
        init: () => ({ model: Model.make({}) }),
        update,
        view: (_model, h) => {
          const widget = Widget.withMessage(h)

          return {
            title: 'missing CustomElement child Mount registration',
            // @ts-expect-error The mounted ChildAttribute requires AnchorWidget registration.
            body: widget(mountedChildAttributes()),
          }
        },
        container: document.createElement('div'),
      })

    expect(renderMissingRegistration).toBeTypeOf('function')
    expect(renderMissingChildRegistration).toBeTypeOf('function')
  })
})
