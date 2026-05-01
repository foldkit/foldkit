import { Schema as S } from 'effect'

export const Location = S.Struct({
  id: S.String,
  name: S.String,
  region: S.String,
  lng: S.Number,
  lat: S.Number,
})
export type Location = typeof Location.Type

export const featuredLocations: ReadonlyArray<Location> = [
  {
    id: 'statue-of-liberty',
    name: 'Statue of Liberty',
    region: 'New York, USA',
    lng: -74.0445,
    lat: 40.6892,
  },
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    region: 'Paris, France',
    lng: 2.2945,
    lat: 48.8584,
  },
  {
    id: 'sydney-opera-house',
    name: 'Sydney Opera House',
    region: 'Sydney, Australia',
    lng: 151.2153,
    lat: -33.8568,
  },
  {
    id: 'great-wall',
    name: 'Great Wall (Mutianyu)',
    region: 'Beijing, China',
    lng: 116.5685,
    lat: 40.4319,
  },
  {
    id: 'christ-the-redeemer',
    name: 'Christ the Redeemer',
    region: 'Rio de Janeiro, Brazil',
    lng: -43.2105,
    lat: -22.9519,
  },
  {
    id: 'taj-mahal',
    name: 'Taj Mahal',
    region: 'Agra, India',
    lng: 78.0421,
    lat: 27.1751,
  },
  {
    id: 'machu-picchu',
    name: 'Machu Picchu',
    region: 'Cusco Region, Peru',
    lng: -72.5449,
    lat: -13.1631,
  },
  {
    id: 'colosseum',
    name: 'Colosseum',
    region: 'Rome, Italy',
    lng: 12.4924,
    lat: 41.8902,
  },
]
