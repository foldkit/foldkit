import { Block, Block as AliasedBlock, defineApplication } from 'foldkit'
import * as Foldkit from 'foldkit'
import { define as aliasedDefine, define } from 'foldkit/block'
import * as BlockModule from 'foldkit/block'

const WrongRoot = Block.define('Root')
const WrongAliasedRoot = AliasedBlock.define('AliasedRoot')
const WrongNamespaceRoot = Foldkit.Block.define('NamespaceRoot')
const WrongSubpathDefine = define('SubpathDefine')
const WrongAliasedSubpathDefine = aliasedDefine('AliasedSubpathDefine')
const WrongRegistered = BlockModule.define('Registered', {
  Model,
  Message,
}).makeComposition({})
const WrongIdentityFirst = Block.define('IdentityFirst').define({
  Model,
  Message,
})
const WrongApplication = defineApplication({ Model, Message })
const WrongRegisteredApplication = defineApplication({
  Model,
  Message,
}).makeComposition({})

void WrongRoot
void WrongAliasedRoot
void WrongNamespaceRoot
void WrongSubpathDefine
void WrongAliasedSubpathDefine
void WrongRegistered
void WrongIdentityFirst
void WrongApplication
void WrongRegisteredApplication

const Separate = Block.define('Separate', { Model, Message })
const WrongSeparateComposition = Separate.makeComposition()
const Shared = Block.define('Shared')
const WrongShared = Shared.define({ Model, Message })
void WrongSeparateComposition
void WrongShared
