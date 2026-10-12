import { Cart, Item } from './domain'
import { Products } from './page'

// Access page modules
Products.Model
Products.view
Products.update
Products.EffectsLayer
Products.subscriptions
Products.managedResources
Products.mounts

// Access domain modules
Cart.addItem(item)(cart)
Cart.totalItems(cart)
