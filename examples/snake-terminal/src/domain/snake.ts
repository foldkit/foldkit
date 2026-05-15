import { Array, Schema as S } from 'effect'

import type { Direction } from './direction'
import * as Position from './position'

export const INITIAL_LENGTH = 3

export const Snake = S.NonEmptyArray(Position.Position)
export type Snake = typeof Snake.Type

export const create = (startPos: Position.Position): Snake =>
  Array.makeBy(INITIAL_LENGTH, i => ({
    x: startPos.x - i,
    y: startPos.y,
  }))

export const move = (snake: Snake, direction: Direction): Snake =>
  Array.matchLeft(snake, {
    onEmpty: () => snake,
    onNonEmpty: (head, tail) => {
      const newHead = Position.move(head, direction)
      return [newHead, head, ...Array.dropRight(tail, 1)]
    },
  })

export const grow = (snake: Snake, direction: Direction): Snake =>
  Array.matchLeft(snake, {
    onEmpty: () => snake,
    onNonEmpty: (head, tail) => {
      const newHead = Position.move(head, direction)
      return [newHead, head, ...tail]
    },
  })

export const hasCollision = (snake: Snake): boolean =>
  Array.matchLeft(snake, {
    onEmpty: () => false,
    onNonEmpty: (head, tail) =>
      Array.some(tail, segment => Position.equivalence(head, segment)),
  })

export const contains = (snake: Snake, pos: Position.Position): boolean =>
  Array.some(snake, segment => Position.equivalence(segment, pos))
