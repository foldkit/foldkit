import { Schema } from 'effect'

import { Domain } from '../../shared/domain'

export const Cart = Schema.Array(Domain.Available)
export type Cart = typeof Cart.Type
