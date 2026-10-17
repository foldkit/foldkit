import { Option } from 'effect'

import { FocusSearchInput } from './command'
import { ApplicationComposition } from './composition'
import { featuredLocations } from './locations'
import { GeolocateState } from './model'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    locations: featuredLocations,
    searchQuery: '',
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
    maybeBounds: Option.none(),
    maybeSelectedLocationId: Option.none(),
    maybeUserLocation: Option.none(),
    geolocateState: GeolocateState.Idle(),
  },
  commands: [FocusSearchInput()],
}))
