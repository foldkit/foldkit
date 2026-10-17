import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const Home = Block.define('Home', {
  Model,
  Message,
  OutMessage,
})

export const HomeComposition = Home.makeComposition()
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
