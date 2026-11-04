import { Block, Block as AliasedBlock } from 'foldkit'
import * as Foldkit from 'foldkit'
import { make as declareBlock } from 'foldkit/block'
import * as BlockModule from 'foldkit/block'

const Wrong = Block.make('Search', { key: SearchKey, Model, Message, Init })
const WrongAlias = AliasedBlock.make('AliasedSearch', { key: AliasedKey, Model, Message, Init })
const WrongNamespace = Foldkit.Block.make('RootSearch', { key: RootKey, Model, Message, Init })
const WrongSubpath = declareBlock('SubpathSearch', { key: SubpathKey, Model, Message, Init })
const WrongModule = BlockModule.make('ModuleSearch', { key: ModuleKey, Model, Message, Init })
const WrongComposition = Block.make('ComposedSearch', { key: ComposedKey, Model, Message, Init }).makeComposition()
