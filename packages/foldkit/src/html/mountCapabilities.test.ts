import { Schema, Stream } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import * as Application from '../runtime/application.js'
import * as Scene from '../test/scene.js'
import type { VNode } from '../vdom.js'
import { type BlockView, defineView } from './block.js'
import {
  type Attribute,
  type ChildAttribute,
  type Html,
  type HtmlBuilder,
  __htmlBuilder,
  childAttributes,
  createKeyedLazy,
  createLazy,
} from './index.js'

const Message = defineMessageUnion({
  CompletedMeasurePanel: { width: Schema.Number },
  CompletedFocusPanel: {},
})
type Message = typeof Message.Type

const ForeignMessage = defineMessageUnion({ ClickedForeign: {} })
type ForeignMessage = typeof ForeignMessage.Type

const Model = Schema.Struct({ isVisible: Schema.Boolean })
type Model = typeof Model.Type

const MeasurePanel = Mount.define('MeasurePanelCapability', {
  messages: [Message.CompletedMeasurePanel],
})

const FocusPanel = Mount.define('FocusPanelCapability', {
  messages: [Message.CompletedFocusPanel],
})

const mounts = [MeasurePanel, FocusPanel]
type MeasurePanelRequirements = Mount.RequirementsOf<typeof MeasurePanel>
type MountRequirements = Mount.RequirementsOf<typeof mounts>

const update = (model: Model, _message: Message) => ({ model })

const mountedPanel = (
  isVisible: boolean,
  h: HtmlBuilder<Message, MeasurePanelRequirements>,
): Html =>
  isVisible
    ? h.keyed('section')(
        'measured-panel',
        [h.OnMount(MeasurePanel())],
        ['visible'],
      )
    : h.div([], ['hidden'])

const lazyPanel = createLazy()
const keyedLazyPanel = createKeyedLazy()

type SlotInputs = Readonly<{
  toView: (
    attributes: ReadonlyArray<ChildAttribute<MeasurePanelRequirements>>,
  ) => VNode | null
}>

const mountedChildView = defineView<
  Model,
  Message,
  SlotInputs,
  MeasurePanelRequirements
>((_model, { toView }, h) =>
  toView(childAttributes([h.OnMount(MeasurePanel())])),
)

const inferredMountedChildView = defineView(
  (model: Model, h: HtmlBuilder<Message, MeasurePanelRequirements>): Html =>
    h.button(
      [h.OnMount(MeasurePanel()), h.OnClick(Message.CompletedFocusPanel())],
      [model.isVisible ? 'visible' : 'hidden'],
    ),
)

const inferredMountedChildViewWithInputs = defineView(
  (
    _model: Model,
    { toView }: SlotInputs,
    h: HtmlBuilder<Message, MeasurePanelRequirements>,
  ): Html => toView(childAttributes([h.OnMount(MeasurePanel())])),
)

const inferredViewRejectingForeignMessage = defineView(
  (_model: Model, h: HtmlBuilder<Message, MeasurePanelRequirements>): Html =>
    h.button([
      // @ts-expect-error The annotated builder preserves its Message universe.
      h.OnClick(ForeignMessage.ClickedForeign()),
    ]),
)

const inferredMountedChildViewExact: BlockView<
  Model,
  Message,
  void,
  MeasurePanelRequirements
> = inferredMountedChildView

const inferredMountedChildViewWithInputsExact: BlockView<
  Model,
  Message,
  SlotInputs,
  MeasurePanelRequirements
> = inferredMountedChildViewWithInputs

describe('Mount capability types', () => {
  it('propagates registered requirements through helpers, lazy views, and Block slots', () => {
    const renderRegistered = () =>
      Application.__makeFromConfig({
        Model,
        init: () => ({ model: { isVisible: true } }),
        update,
        view: (model, h) => ({
          title: 'registered',
          body: h.div(
            [],
            [
              mountedPanel(model.isVisible, h),
              lazyPanel(mountedPanel, [model.isVisible, h]),
              keyedLazyPanel('panel', mountedPanel, [model.isVisible, h]),
              h.block({
                slotId: 'mounted-child',
                model,
                view: mountedChildView,
                viewInputs: {
                  toView: attributes => h.section(attributes),
                },
                toParentMessage: message => message,
              }),
            ],
          ),
        }),
        mounts,
        container: document.createElement('div'),
      })

    const renderWithExtraRegistration = () =>
      Application.__makeFromConfig({
        Model,
        init: () => ({ model: { isVisible: true } }),
        update,
        view: (model, h) => ({
          title: 'extra registration',
          body: mountedPanel(model.isVisible, h),
        }),
        mounts,
        container: document.createElement('div'),
      })

    expect(renderRegistered).toBeTypeOf('function')
    expect(renderWithExtraRegistration).toBeTypeOf('function')
  })

  it('rejects layered Mounts omitted from the application registry', () => {
    const renderMissingRegistration = () =>
      Application.__makeFromConfig({
        Model,
        init: () => ({ model: { isVisible: true } }),
        update,
        view: (model, h) => ({
          title: 'missing registration',
          // @ts-expect-error The helper requires MeasurePanel registration.
          body: mountedPanel(model.isVisible, h),
        }),
        container: document.createElement('div'),
      })

    const mountlessBuilder = __htmlBuilder<Message>()
    const renderMissingChildRegistration = () =>
      mountlessBuilder.block(
        // @ts-expect-error The child view requires MeasurePanel registration.
        {
          slotId: 'missing-child-registration',
          model: { isVisible: true },
          view: inferredMountedChildView,
          toParentMessage: message => message,
        },
      )
    const renderMissingChildInputsRegistration = () =>
      mountlessBuilder.block(
        // @ts-expect-error The child view with inputs requires MeasurePanel registration.
        {
          slotId: 'missing-child-inputs-registration',
          model: { isVisible: true },
          view: inferredMountedChildViewWithInputs,
          viewInputs: { toView: () => null },
          toParentMessage: message => message,
        },
      )

    expect(renderMissingRegistration).toBeTypeOf('function')
    expect(renderMissingChildRegistration).toBeTypeOf('function')
    expect(renderMissingChildInputsRegistration).toBeTypeOf('function')
  })

  it('infers exact Block view contracts from annotated parameters', () => {
    const registeredBuilder = __htmlBuilder<Message, MeasurePanelRequirements>()
    const foreignBuilder = __htmlBuilder<
      ForeignMessage,
      MeasurePanelRequirements
    >()

    const renderInferred = () =>
      inferredMountedChildView({ isVisible: true }, registeredBuilder)
    const renderInferredWithInputs = () =>
      inferredMountedChildViewWithInputs(
        { isVisible: true },
        { toView: () => null },
        registeredBuilder,
      )
    const renderWithWrongBuilder = () =>
      inferredMountedChildView(
        { isVisible: true },
        // @ts-expect-error The inferred view preserves its exact Message type.
        foreignBuilder,
      )
    const renderTwoArgumentViewWithInputs = () =>
      inferredMountedChildView(
        { isVisible: true },
        { toView: () => null },
        // @ts-expect-error A two-argument view does not accept ViewInputs.
        registeredBuilder,
      )
    const renderThreeArgumentViewWithoutInputs = () =>
      // @ts-expect-error A three-argument view requires ViewInputs.
      inferredMountedChildViewWithInputs({ isVisible: true }, registeredBuilder)

    const unannotatedView = defineView((model, h) => {
      // @ts-expect-error An unannotated Model remains unknown.
      const isVisible = model.isVisible
      // @ts-expect-error An unannotated builder accepts no Message.
      const onClick = h.OnClick(Message.CompletedFocusPanel())
      return h.button([onClick], [globalThis.String(isVisible)])
    })

    const defineVoidInputsView = () =>
      defineView(
        // @ts-expect-error A void ViewInputs type has the two-argument runtime shape.
        (
          _model: Model,
          _viewInputs: void,
          _h: HtmlBuilder<Message, MeasurePanelRequirements>,
        ) => null,
      )
    const defineUndefinedInputsView = () =>
      defineView(
        // @ts-expect-error An undefined ViewInputs type has the two-argument runtime shape.
        (
          _model: Model,
          _viewInputs: undefined,
          _h: HtmlBuilder<Message, MeasurePanelRequirements>,
        ) => null,
      )

    const renderInScene = () =>
      Scene.scene(
        { update, view: inferredMountedChildView },
        Scene.given<Model>({ isVisible: true }),
      )

    expect(inferredMountedChildViewExact).toBe(inferredMountedChildView)
    expect(inferredMountedChildViewWithInputsExact).toBe(
      inferredMountedChildViewWithInputs,
    )
    expect(inferredViewRejectingForeignMessage).toBeTypeOf('function')
    expect(renderInferred).toBeTypeOf('function')
    expect(renderInferredWithInputs).toBeTypeOf('function')
    expect(renderWithWrongBuilder).toBeTypeOf('function')
    expect(renderTwoArgumentViewWithInputs).toBeTypeOf('function')
    expect(renderThreeArgumentViewWithoutInputs).toBeTypeOf('function')
    expect(unannotatedView).toBeTypeOf('function')
    expect(defineVoidInputsView).toBeTypeOf('function')
    expect(defineUndefinedInputsView).toBeTypeOf('function')
    expect(renderInScene).toBeTypeOf('function')
  })

  it('does not erase requirements through public attribute containers', () => {
    const structuralAttribute: Attribute<Message> = {
      _tag: 'OnMount',
      // @ts-expect-error Attribute defaults to raw MountActions with no requirements.
      action: MeasurePanel(),
    }

    const preciseAttribute: Attribute<Message, MeasurePanelRequirements> = {
      _tag: 'OnMount',
      action: MeasurePanel(),
    }
    const preciseBuilder = __htmlBuilder<Message, MeasurePanelRequirements>()
    const renderPreciseAttribute = () => preciseBuilder.div([preciseAttribute])

    const structuralChildAttribute: ChildAttribute = {
      __childAttribute: true,
      attribute: {
        _tag: 'OnMount',
        // @ts-expect-error A structural ChildAttribute cannot hide a layered Mount.
        action: MeasurePanel(),
      },
      dispatch: () => {},
      resolveUnmount: () => () => {},
      boundaryMappers: [],
    }

    expect(structuralAttribute).toBeDefined()
    expect(structuralChildAttribute).toBeDefined()
    expect(renderPreciseAttribute).toBeTypeOf('function')
  })

  it('does not erase requirements through childAttributes input annotations', () => {
    const preciseBuilder = __htmlBuilder<Message, MeasurePanelRequirements>()
    const tagOnlyAttributes: ReadonlyArray<Readonly<{ _tag: string }>> = [
      preciseBuilder.OnMount(MeasurePanel()),
    ]
    const rejectTagOnlyAttributes = () =>
      // @ts-expect-error A tag-only array has erased the Attribute contract.
      childAttributes(tagOnlyAttributes)

    const broadAttributes: ReadonlyArray<Attribute<unknown, unknown>> = [
      preciseBuilder.OnMount(MeasurePanel()),
    ]
    const acceptsUnknownRequirements = (
      _attributes: ReadonlyArray<ChildAttribute<unknown>>,
    ): void => {}
    const rejectBroadChildAttributes = () => {
      const broadChildAttributes = childAttributes(broadAttributes)
      acceptsUnknownRequirements(broadChildAttributes)
      const mountlessBuilder = __htmlBuilder<Message>()

      // @ts-expect-error Unknown requirements cannot enter a mountless builder.
      return mountlessBuilder.div(broadChildAttributes)
    }

    expect(rejectTagOnlyAttributes).toBeTypeOf('function')
    expect(rejectBroadChildAttributes).toBeTypeOf('function')
  })

  it('rejects a registry whose definition identities were widened away', () => {
    const widenedMounts: ReadonlyArray<Mount.LayeredMountDefinition> = [
      MeasurePanel,
    ]
    type ContractWidenedMounts = ReadonlyArray<
      Mount.LayeredMountDefinitionWithArgs<
        'MeasurePanelCapability',
        any,
        typeof Message.CompletedMeasurePanel.Type
      >
    >

    const renderWidenedRegistry = () =>
      // @ts-expect-error A broad registry cannot prove which Mounts are registered.
      Application.__makeFromConfig({
        Model,
        init: () => ({ model: { isVisible: true } }),
        update,
        view: (model, h) => ({
          title: 'widened registry',
          body: h.div([], [globalThis.String(model.isVisible)]),
        }),
        mounts: widenedMounts,
        container: document.createElement('div'),
      })

    const preserveExactRegistry:
      | (typeof mounts & Mount.PreciseMountRegistry<typeof mounts>)
      | undefined = mounts

    const preserveRegistry = <
      const Registry extends ReadonlyArray<Mount.LayeredMountDefinition>,
    >(
      registry: Registry & Mount.PreciseMountRegistry<Registry>,
    ): Registry => registry

    const renderContractWidenedRegistry = (registry: ContractWidenedMounts) =>
      // @ts-expect-error The exact registry guard rejects erased Mount args.
      preserveRegistry<ContractWidenedMounts>(registry)

    expect(preserveExactRegistry).toBe(mounts)
    expect(renderWidenedRegistry).toBeTypeOf('function')
    expect(renderContractWidenedRegistry).toBeTypeOf('function')
  })

  it('keeps raw MountActions with no requirements valid', () => {
    const rawMount: Mount.MountAction<Message, string> = {
      name: 'RawMount',
      f: () => Stream.empty,
    }
    const mountlessBuilder = __htmlBuilder<Message>()
    const renderRawMount = () =>
      mountlessBuilder.div([mountlessBuilder.OnMount(rawMount)])

    expect(renderRawMount).toBeTypeOf('function')
  })

  it('keeps same-name handler protocols invariant', () => {
    const IncompatibleMeasurePanel = Mount.define('MeasurePanelCapability', {
      args: { selector: Schema.String },
      messages: [Message.CompletedFocusPanel],
    })
    type Expected = Mount.RequirementsOf<typeof MeasurePanel>
    type Incompatible = Mount.RequirementsOf<typeof IncompatibleMeasurePanel>

    const acceptsExpected = (_requirement: Expected): void => {}
    const rejectIncompatible = (requirement: Incompatible): void => {
      // @ts-expect-error Same name does not erase a different args/result contract.
      acceptsExpected(requirement)
    }

    expect(rejectIncompatible).toBeTypeOf('function')
  })

  it('derives the union from readonly exported registries', () => {
    const acceptsRequirements = (_requirements: MountRequirements): void => {}

    expect(acceptsRequirements).toBeTypeOf('function')
  })
})
