import { Layer, Option } from 'effect'
import type { Resolved } from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import { ApplicationLive, GeolocateState, type Model } from './application'
import { type Location, featuredLocations } from './domain/location'
import { ApplicationLayer } from './services'
import { SidebarLive } from './sidebar'

export const TestLive = ApplicationLive.pipe(
  Layer.provide(SidebarLive),
  Layer.provide(ApplicationLayer),
)

export const initialModel: Resolved<Model> = {
  sidebar: { searchQuery: '' },
  locations: featuredLocations,
  maybeMapHostId: Option.none(),
  maybeMapError: Option.none(),
  maybeBounds: Option.none(),
  maybeSelectedLocationId: Option.none(),
  maybeUserLocation: Option.none(),
  geolocateState: GeolocateState.Idle(),
}

export const mountedModel: Resolved<Model> = modifyFields(initialModel, {
  maybeMapHostId: () => Option.some('map-host-1'),
})

export const eiffelTower: Location = {
  id: 'eiffel-tower',
  name: 'Eiffel Tower',
  region: 'Paris, France',
  lng: 2.2945,
  lat: 48.8584,
}
