import { Array, Option, Schema as S } from 'effect'

export const Artwork = S.Struct({
  id: S.Number,
  title: S.String,
  medium: S.String,
  description: S.String,
  gradientClassName: S.String,
})
export type Artwork = typeof Artwork.Type

export const artworks: ReadonlyArray<Artwork> = [
  {
    id: 1,
    title: 'Dawn Chorus',
    medium: 'Gradient on canvas',
    description:
      'A warm wash of first light. The rose bleeds into amber the way a sunrise refuses a hard edge.',
    gradientClassName: 'from-rose-400 to-amber-300',
  },
  {
    id: 2,
    title: 'Deep Water',
    medium: 'Gradient on linen',
    description:
      'Open ocean past the shelf, where the blue stops describing depth and starts describing weight.',
    gradientClassName: 'from-sky-500 to-indigo-700',
  },
  {
    id: 3,
    title: 'Moss Study',
    medium: 'Gradient on paper',
    description:
      'Forest floor after a week of rain. Every green in the study is borrowed from something alive.',
    gradientClassName: 'from-lime-400 to-emerald-600',
  },
  {
    id: 4,
    title: 'Violet Hour',
    medium: 'Gradient on canvas',
    description:
      'The ten minutes after sunset when streetlights and sky briefly agree on a color.',
    gradientClassName: 'from-purple-500 to-fuchsia-400',
  },
  {
    id: 5,
    title: 'Kiln',
    medium: 'Gradient on steel',
    description:
      'Heat rendered literally. Orange at the mouth of the furnace, red where the eye gives up.',
    gradientClassName: 'from-orange-500 to-red-600',
  },
  {
    id: 6,
    title: 'Glacier Milk',
    medium: 'Gradient on linen',
    description:
      'Meltwater carries rock flour that turns whole rivers this improbable, chalky turquoise.',
    gradientClassName: 'from-cyan-300 to-teal-500',
  },
  {
    id: 7,
    title: 'Graphite',
    medium: 'Gradient on paper',
    description:
      'A monochrome argument that gray is not one color. Pencil shading scaled up to a weather system.',
    gradientClassName: 'from-slate-400 to-zinc-700',
  },
  {
    id: 8,
    title: 'Pollen',
    medium: 'Gradient on canvas',
    description:
      'Late spring in a single field. The yellow is loud on purpose; so is the season.',
    gradientClassName: 'from-yellow-300 to-lime-500',
  },
]

export const findArtwork = (artworkId: number): Option.Option<Artwork> =>
  Array.findFirst(artworks, artwork => artwork.id === artworkId)
