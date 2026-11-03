import { Products } from './blocks'
import { Cart, Item } from './domain'

// Access a feature namespace
Products.ProductsBlock.Model
Products.ProductsBlock.Message
Products.ProductsBlock.OutMessage

// Access domain modules
Cart.addItem(item)(cart)
Cart.totalItems(cart)
