import { Match, Option } from 'effect'
import { Html } from 'foldkit/html'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
  ProductsPageBinding,
} from './composition'
import { Cart } from './domain'
import type { Model } from './model'
import { Cart as CartPage, Checkout } from './page'
import {
  ApplicationRoute,
  cartRouter,
  checkoutRouter,
  productsRouter,
} from './route'

const navigationView = (
  currentRoute: ApplicationRoute,
  cartCount: number,
  h: ApplicationViewBuilder,
): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return h.nav(
    [h.Class('bg-blue-500 text-white p-4 mb-6')],
    [
      h.ul(
        [h.Class('max-w-6xl mx-auto flex gap-6 justify-center list-none')],
        [
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(productsRouter({ searchText: Option.none() })),
                  h.Class(navLinkClassName(currentRoute._tag === 'Products')),
                ],
                ['Products'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(cartRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Cart')),
                ],
                cartCount > 0 ? [`Cart (${cartCount})`] : ['Cart'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(checkoutRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Checkout')),
                ],
                ['Checkout'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const productsView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.block(
    ProductsPageBinding.embedView({
      slotId: 'products',
      model: model.productsPage,
      viewInputs: { cart: model.cart },
    }),
  )

const cartView = (model: Model, h: ApplicationViewBuilder): Html =>
  CartPage.view(model.cart, h)

const checkoutView = (model: Model, h: ApplicationViewBuilder): Html =>
  Checkout.view(model.cart, model.deliveryInstructions, model.orderPlaced, h)

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [
          h.Href(productsRouter({ searchText: Option.none() })),
          h.Class('text-blue-500 hover:underline'),
        ],
        ['← Go to Products'],
      ),
    ],
  )

const routeTitle = (route: Model['route']): string =>
  Match.value(route).pipe(
    Match.tag('Products', () => 'Shopping Cart'),
    Match.orElse(({ _tag }) => `${_tag} | Shopping Cart`),
  )

export const view = ApplicationComposition.makeView((model, h) => {
  const routeContent = ApplicationRoute.match(model.route, {
    Products: () => productsView(model, h),
    Cart: () => cartView(model, h),
    Checkout: () => checkoutView(model, h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-100')],
      [
        h.header(
          [],
          [navigationView(model.route, Cart.totalItems(model.cart), h)],
        ),
        h.main([h.Class('py-8')], [routeContent]),
      ],
    ),
  }
})
