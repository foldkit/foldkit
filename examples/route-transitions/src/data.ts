import { Array, Option, Schema as S, pipe } from 'effect'

export const Painting = S.Struct({
  id: S.Number,
  title: S.String,
  artist: S.String,
  gradient: S.String,
})
export type Painting = typeof Painting.Type

export const paintings: ReadonlyArray<Painting> = [
  {
    id: 1,
    title: 'Dawn Over the Harbor',
    artist: 'Mara Ellsworth',
    gradient: 'from-rose-300 via-amber-200 to-sky-300',
  },
  {
    id: 2,
    title: 'Static in Bloom',
    artist: 'Jun Okabe',
    gradient: 'from-fuchsia-400 via-purple-300 to-indigo-400',
  },
  {
    id: 3,
    title: 'Winter Circuit',
    artist: 'Ada Lindqvist',
    gradient: 'from-slate-300 via-cyan-200 to-blue-400',
  },
  {
    id: 4,
    title: 'Ferric Meadow',
    artist: 'Tomás Reyes',
    gradient: 'from-lime-300 via-emerald-300 to-teal-400',
  },
  {
    id: 5,
    title: 'Ultraviolet Tide',
    artist: 'Nadia Boulos',
    gradient: 'from-indigo-400 via-violet-400 to-pink-300',
  },
  {
    id: 6,
    title: 'Ember Study No. 4',
    artist: 'Hal Whitaker',
    gradient: 'from-orange-400 via-red-300 to-rose-400',
  },
]

export const findPaintingWithIndex = (
  paintingId: number,
): Option.Option<Readonly<{ painting: Painting; paintingIndex: number }>> =>
  pipe(
    Array.findFirstIndex(paintings, painting => painting.id === paintingId),
    Option.flatMap(paintingIndex =>
      Option.map(Array.get(paintings, paintingIndex), painting => ({
        painting,
        paintingIndex,
      })),
    ),
  )
