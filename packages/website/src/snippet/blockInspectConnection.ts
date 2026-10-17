import { Block } from 'foldkit'

import { Application } from './definition'
import { Message } from './message'
import { Model } from './model'
import { Room } from './page'

const RoomBinding = Application.bindChild(Room.block, {
  field: 'room',
  parentMessage: Message.GotRoomMessage,
})

const roomInspection = Block.inspectBinding(RoomBinding)

export const roomSubscriptions = roomInspection.subscriptions
export const roomManagedResources = roomInspection.managedResources
export const roomMounts = roomInspection.mounts
export const RoomEffectsLayer = roomInspection.EffectsLayer
