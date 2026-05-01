import { Option } from 'effect'

import { Location, featuredLocations } from './locations'
import { GeolocateIdle, type Model } from './main'

export const initialModel: Model = {
  locations: featuredLocations,
  searchQuery: '',
  maybeMapHostId: Option.none(),
  maybeMapError: Option.none(),
  maybeBounds: Option.none(),
  maybeSelectedLocationId: Option.none(),
  maybeUserLocation: Option.none(),
  geolocateState: GeolocateIdle(),
}

export const mountedModel: Model = {
  ...initialModel,
  maybeMapHostId: Option.some('map-host-1'),
}

export const eiffelTower: Location = {
  id: 'eiffel-tower',
  name: 'Eiffel Tower',
  region: 'Paris, France',
  lng: 2.2945,
  lat: 48.8584,
}
