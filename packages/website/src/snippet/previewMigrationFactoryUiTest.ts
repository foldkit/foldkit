import { Scene } from 'foldkit'

import { test as MenuTest, makeBlock as makeMenuBlock } from '@foldkit/ui/menu'

const ChordMenuBlock = makeMenuBlock()

Scene.Command.resolve(
  MenuTest.FocusMenuItems,
  ChordMenuBlock.Message.CompletedFocusMenuItems(),
)

Scene.Mount.resolve(
  MenuTest.AnchorMenu,
  ChordMenuBlock.Message.CompletedAnchorMenu(),
)
