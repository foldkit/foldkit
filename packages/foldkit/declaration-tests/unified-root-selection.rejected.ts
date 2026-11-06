import { Effect, Layer } from 'effect'
import { Program } from 'foldkit'
import * as Server from 'foldkit/experimental/server'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import {
  PageBlock,
  simpleSetupPage,
} from './unified-root-selection.accepted.js'
import {
  ChildrenBinding,
  DeclaredStoreChildBlock,
  OtherBlock,
  SessionBlock,
  SessionReaderLayer,
  declaredStoreParent,
  explicitUnionCallbackService,
  otherRegisteredLayer,
  otherUnregistered,
  pageRegistered,
  pageRegisteredLayer,
  pageUnregistered,
  registered,
  registeredLayer,
  simpleSetup,
  simpleSetupPageLayer,
  unregistered,
  unregisteredLayer,
  withSetupService,
} from './unified-root-selection.accepted.js'

Story.messageIn(
  ChildrenBinding,
  // @ts-expect-error The keyed child delivery requires the Binding's decoded key.
  1,
  DeclaredStoreChildBlock.Message.CompletedRead(),
)

Story.messageIn(
  ChildrenBinding,
  'first',
  // @ts-expect-error The delivered Message must belong to the bound child.
  { _tag: 'Wrong' },
)

export const rejectSpreadUnion = (
  selection: typeof registered | typeof unregistered,
) => {
  const pending = Program.makeElement({
    ...selection,
    container: null,
  }).provide(Layer.empty)
  // @ts-expect-error An absent resource in one selection remains an ordinary requirement.
  pending.start()
}
export const rejectUnionProviderInput = (
  selection: typeof registered | typeof unregistered,
) => {
  const pending = Program.makeElement({ ...selection, container: null })
    .provide(SessionReaderLayer)
    .provide(Layer.empty)
  // @ts-expect-error A provider cannot use a resource absent from one selection.
  pending.start()
}
export const rejectExplicitLayerUnion = (
  layer: typeof registeredLayer | typeof unregisteredLayer,
) => {
  const pending = Program.makeElement({
    block: SessionBlock,
    layer,
    container: null,
  }).provide(SessionReaderLayer)
  // @ts-expect-error Explicit Layer unions require the same guaranteed-resource proof.
  pending.start()
}
export const rejectDifferentKeys = (
  selection: typeof registered | typeof otherUnregistered,
) => {
  const pending = Program.makeElement({
    ...selection,
    container: null,
  }).provide(SessionReaderLayer)
  // @ts-expect-error One Block key's registration cannot satisfy another selected implementation.
  pending.start()
}
export const rejectPageSpreadUnion = (
  selection: typeof pageRegistered | typeof pageUnregistered,
) => {
  const pending = Program.make({ ...selection, container: null }).provide(
    SessionReaderLayer,
  )
  // @ts-expect-error Page hosts preserve the same resource guarantee across alternatives.
  pending.start()
}
export const rejectWrongProvider = () => {
  // @ts-expect-error The selected Layer belongs to a different public Block key.
  Program.makeElement({
    block: OtherBlock,
    layer: registeredLayer,
    container: null,
  })
}
export const rejectCrossedUnion = (
  selection:
    | typeof registered
    | Readonly<{ block: typeof OtherBlock; layer: typeof registeredLayer }>,
) => {
  // @ts-expect-error Every original pair must use its own provider.
  Program.makeElement({ ...selection, container: null })
  // @ts-expect-error Pure acquisition must reject a swapped original pair.
  Story.withBlock(selection, () => undefined)
  // @ts-expect-error Story must reject a swapped original pair.
  Story.story(selection, Story.init())
  // @ts-expect-error Scene must reject a swapped original pair.
  Scene.scene(selection, Scene.init())
}
export const rejectWrongView = () => {
  // @ts-expect-error An Element view cannot be hosted as a Document.
  Program.make({ ...registered, container: null })
  // @ts-expect-error A Document view cannot be hosted as an Element.
  Program.makeElement({ ...pageRegistered, container: null })
}
export const rejectBroadChildContract = () => {
  const pending = Program.makeElement({
    ...declaredStoreParent,
    container: null,
  })
  // @ts-expect-error A child contract that permits external Store retains that requirement.
  pending.start()
}

export const rejectSiblingWrongProviders = () => {
  const wrongProvider = { block: OtherBlock, layer: registeredLayer }

  // @ts-expect-error Pure acquisition validates the original selected Block key.
  Story.withBlock(wrongProvider, () => undefined)
  // @ts-expect-error Story validates the original selected Block key.
  Story.story({ block: OtherBlock, layer: registeredLayer }, Story.init())
  // @ts-expect-error Scene validates the original selected Block key.
  Scene.scene({ block: OtherBlock, layer: registeredLayer }, Scene.init())
  // @ts-expect-error Server validates the original selected Block key.
  Server.renderToString({ block: PageBlock, layer: registeredLayer }, {})
}

export const rejectDifferentPageKeys = (
  selection: typeof pageRegistered | typeof simpleSetupPage,
) => {
  const pending = Program.make({ ...selection, container: null }).provide(
    SessionReaderLayer,
  )

  // @ts-expect-error A registered alternative cannot supply another Page's runtime resource.
  pending.start()
}

export const rejectCallbackProviderUnion = (
  selection: typeof simpleSetup | typeof withSetupService,
) => {
  // @ts-expect-error A callback Service supplied by only one Layer alternative remains required.
  Effect.runPromise(explicitUnionCallbackService(selection))
}

export const rejectForeignLayerAlternative = (
  layer: typeof registeredLayer | typeof otherRegisteredLayer,
) => {
  // @ts-expect-error Every Layer alternative must implement the selected Block.
  Program.makeElement({ block: SessionBlock, layer, container: null })
  // @ts-expect-error Pure acquisition must reject a foreign Layer alternative.
  Story.withBlock({ block: SessionBlock, layer }, () => undefined)
  // @ts-expect-error Story must reject a foreign Layer alternative.
  Story.story({ block: SessionBlock, layer }, Story.init())
  // @ts-expect-error Scene must reject a foreign Layer alternative.
  Scene.scene({ block: SessionBlock, layer }, Scene.init())
}

export const rejectForeignPageLayerAlternative = (
  layer: typeof pageRegisteredLayer | typeof simpleSetupPageLayer,
) => {
  // @ts-expect-error Every Page Layer alternative must implement the selected Block.
  Program.make({ block: PageBlock, layer, container: null })
  // @ts-expect-error Server must reject a foreign Layer alternative.
  Server.renderToString({ block: PageBlock, layer }, {})
}

export const rejectCrossedPageSelection = (
  selection:
    | typeof pageRegistered
    | Readonly<{
        block: typeof simpleSetupPage.block
        layer: typeof pageRegisteredLayer
      }>,
) => {
  // @ts-expect-error Page hosts must reject every swapped original pair.
  Program.make({ ...selection, container: null })
  // @ts-expect-error Server must reject every swapped original pair.
  Server.renderToString(selection, {})
}
