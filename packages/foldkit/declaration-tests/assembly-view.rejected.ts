import { Program } from 'foldkit'
import * as Block from 'foldkit/block'

import {
  ApplicationComposition,
  documentView,
  elementView,
  helper,
  init,
  update,
} from './assembly-view.accepted.js'

// @ts-expect-error An inline view must first be authored with Composition.makeView.
ApplicationComposition.prepareBlock({
  init,
  update,
  view: () => ({ title: 'Unowned', body: null }),
})

// @ts-expect-error An inline view must first be authored with Composition.makeView.
ApplicationComposition.prepareBlock({
  init,
  update,
  view: () => null,
})

// @ts-expect-error A precisely typed helper still needs Composition ownership.
ApplicationComposition.prepareBlock({
  init,
  update,
  view: helper,
})

const prepareElementBlock = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view: elementView,
  })
const elementBlock: Block.FromAssemblyWithView<
  typeof ApplicationComposition.Model,
  typeof prepareElementBlock
> = Block.assemble(prepareElementBlock)
// @ts-expect-error Program.make requires a Document view.
Program.make({
  block: elementBlock,
  container: null,
})

const prepareDocumentBlock = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view: documentView,
  })
const documentBlock: Block.FromAssemblyWithView<
  typeof ApplicationComposition.Model,
  typeof prepareDocumentBlock
> = Block.assemble(prepareDocumentBlock)
// @ts-expect-error Program.makeElement requires an Html view.
Program.makeElement({
  block: documentBlock,
  container: null,
})
