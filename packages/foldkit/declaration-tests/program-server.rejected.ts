import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Server from 'foldkit/experimental/server'
import type { Url } from 'foldkit/url'

import { ServerRootBlock } from './program-server.accepted.js'
import { ElementBlock, Flags, PageBlock } from './program.accepted.js'

declare const isNarrowRoot: boolean
const NarrowFlags = Schema.Struct({ status: Schema.Literal('Ready') })
const NarrowServerRootComposition = Block.makeDefinition('NarrowServerRoot', {
  Model: PageBlock.Model,
  Message: Schema.Never,
}).makeComposition()
const prepareNarrowServerRootBlock = () =>
  NarrowServerRootComposition.prepareBlock({
    init: NarrowServerRootComposition.makeInit(
      (flags: typeof NarrowFlags.Type, _url: Url) => ({
        model: { status: flags.status },
      }),
    ),
    update: NarrowServerRootComposition.makeUpdate({}),
    view: NarrowServerRootComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
const NarrowServerRootBlock: Block.FromAssemblyWithView<
  typeof PageBlock.Model,
  typeof prepareNarrowServerRootBlock
> = Block.assemble(prepareNarrowServerRootBlock)
const MixedFlagsRoot = isNarrowRoot ? NarrowServerRootBlock : PageBlock
void Server.renderToString(
  MixedFlagsRoot,
  // @ts-expect-error The Flags must match every possible root initializer.
  { Flags, routing: {} },
  {
    flags: { status: 'Another status' },
    url: 'https://foldkit.dev',
    isHydratable: false,
  },
)

void Server.renderToString(
  // @ts-expect-error An Element root cannot supply a server Document view.
  ElementBlock,
  { Flags },
  { flags: { status: 'Ready' }, isHydratable: false },
)

void Server.renderToString(
  PageBlock,
  // @ts-expect-error A routed initializer requires the server routing mode.
  { Flags },
  { flags: { status: 'Ready' }, isHydratable: false },
)

const OtherFlags = Schema.Struct({ count: Schema.Number })
void Server.renderToString(
  PageBlock,
  // @ts-expect-error Undefined cannot enable the URL initialization mode.
  { Flags, routing: undefined },
  {
    flags: { status: 'Ready' },
    url: 'https://foldkit.dev',
    isHydratable: false,
  },
)

void Server.renderToString(
  PageBlock,
  // @ts-expect-error Flags must match the completed root initializer.
  { Flags: OtherFlags, routing: {} },
  { flags: { count: 1 }, url: 'https://foldkit.dev', isHydratable: false },
)

const duplicatedBehavior = { init: ServerRootBlock.init }
void Server.renderToString(
  ServerRootBlock,
  // @ts-expect-error Host options cannot replace the completed Block initializer.
  duplicatedBehavior,
  { isHydratable: false },
)

void Server.renderToString(
  ServerRootBlock,
  // @ts-expect-error A zero-argument initializer cannot opt into URL initialization.
  { routing: {} },
  { url: 'https://foldkit.dev', isHydratable: false },
)
