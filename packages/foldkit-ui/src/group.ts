import { Array } from 'effect'

/** A contiguous segment of items sharing the same group key. */
export type Segment<A> = Readonly<{ key: string; items: ReadonlyArray<A> }>

/** Groups items into contiguous segments by a key function. Adjacent items with the same key are collected into a single segment. */
export const groupContiguous = <A>(
  items: ReadonlyArray<A>,
  toKey: (item: A, index: number) => string,
): ReadonlyArray<Segment<A>> => {
  const tagged = Array.map(items, (item, index) => ({
    key: toKey(item, index),
    item,
  }))

  return Array.chop(tagged, nonEmpty => {
    const key = Array.headNonEmpty(nonEmpty).key
    const [matching, rest] = Array.span(nonEmpty, tagged => tagged.key === key)
    return [{ key, items: Array.map(matching, ({ item }) => item) }, rest]
  })
}
