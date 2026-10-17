import { Imported } from './definition'
import { Block, Block as AliasedBlock, defineApplication } from 'foldkit'
import * as Foldkit from 'foldkit'
import { define as aliasedDefine, define } from 'foldkit/block'
import * as BlockModule from 'foldkit/block'

import { block as ImportedFeature } from './feature.ts'

const blockName = 'DynamicBlock'

const Root = Block.define('Root')
const AliasedRoot = AliasedBlock.define('AliasedRoot')
const NamespaceRoot = Foldkit.Block.define('NamespaceRoot')
const SubpathDefine = define('SubpathDefine')
const AliasedSubpathDefine = aliasedDefine('AliasedSubpathDefine')
const SubpathNamespace = BlockModule.define('SubpathNamespace')
const RegisteredComposition = Block.define('Registered', {
  Model,
  Message,
}).makeComposition({})
const IdentityFirst = Block.define('IdentityFirst').define({
  Model,
  Message,
})
const IdentityFirstComposition = Block.define(
  'IdentityFirst',
).define({ Model, Message }).makeComposition({})
const Application = defineApplication({ Model, Message })
const ApplicationComposition = defineApplication({ Model, Message }).makeComposition({})
const DynamicBlock = AliasedBlock.define(blockName)
const ImportedAlias = ImportedFeature

const registry = {
  define: (name: string) => name,
}
const Unrelated = registry.define('DifferentName')
const unrelatedFactory = {
  define: (_name: string) => ({ define: () => ({}) }),
}
const UnrelatedChain = unrelatedFactory.define('DifferentName').define()
const unrelatedComposer = { makeComposition: () => ({}) }
const UnrelatedCompositionResult = unrelatedComposer.makeComposition()

const useShadowedBlock = (Block: typeof AliasedBlock) => {
  const LocalBlock = Block.define('DifferentName')

  return LocalBlock
}

void Root
void AliasedRoot
void NamespaceRoot
void SubpathDefine
void AliasedSubpathDefine
void SubpathNamespace
void RegisteredComposition
void IdentityFirst
void IdentityFirstComposition
void Application
void ApplicationComposition
void DynamicBlock
void ImportedAlias
void Unrelated
void UnrelatedChain
void UnrelatedCompositionResult
void useShadowedBlock

const Separate = Block.define('Separate', { Model, Message })
const SeparateComposition = Separate.makeComposition()
const ImportedResult = Imported.makeComposition()
void SeparateComposition
void ImportedResult
