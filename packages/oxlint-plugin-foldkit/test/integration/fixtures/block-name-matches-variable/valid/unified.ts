import { Effect } from 'effect'
import { Block } from 'foldkit'
import { make as declareBlock } from 'foldkit/block'

const SearchBlock = Block.make('Search', { key: SearchKey, Model, Message, Init })
const SearchComposition = SearchBlock.makeComposition()
const SubpathSearchBlock = declareBlock('SubpathSearch', { key: SubpathKey, Model, Message, Init })
const layer = SearchBlock.makeLayer(Effect.gen(function* () {
  return { init, update, view }
}))

const unrelated = { make: (name: string) => name }
const unrelatedValue = unrelated.make('Search')
const shadowed = (Block: typeof import('foldkit').Block) => Block.make('Different', {})
