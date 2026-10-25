import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Server from 'foldkit/experimental/server'

import { Flags, Model, PageBlock } from './program.accepted.js'

const DeclarationServerRootComposition = Block.makeDefinition(
  'DeclarationServerRoot',
  { Model, Message: Schema.Never },
).makeComposition()

const prepareServerRootBlock = () =>
  DeclarationServerRootComposition.prepareBlock({
    init: DeclarationServerRootComposition.makeInit(() => ({
      model: { status: 'Ready' },
    })),
    update: DeclarationServerRootComposition.makeUpdate({}),
    view: DeclarationServerRootComposition.makeView((model, h) => ({
      title: model.status,
      body: h.main([], [model.status]),
    })),
  })
export const ServerRootBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareServerRootBlock
> = Block.assemble(prepareServerRootBlock)

export const renderPure = () =>
  Server.renderToString(ServerRootBlock, {}, { isHydratable: false })

export const renderRouted = (flags: typeof Flags.Type) =>
  Server.renderToString(
    PageBlock,
    { Flags, routing: {} },
    { flags, url: 'https://foldkit.dev/docs', isHydratable: false },
  )
