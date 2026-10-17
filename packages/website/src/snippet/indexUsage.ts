import { Cart, Item } from './domain'
import { Products } from './page'

// Access a feature namespace
Products.Model
Products.Message
Products.block
Products.OutMessage.match

// Access domain modules
Cart.addItem(item)(cart)
Cart.totalItems(cart)
