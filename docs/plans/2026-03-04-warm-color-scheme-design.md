# Warm Color Scheme Design

## Problem

The website uses Tailwind's default cool blue-gray scale and pure white backgrounds, which feel stock and impersonal. The goal is a warmer palette — cream for light mode, warm charcoal for dark mode — that gives Foldkit a distinctive, crafted feel without being flashy.

## Approach

Override Tailwind's `gray` scale in `@theme` with warm values, and introduce a `cream` token for surface backgrounds. This avoids touching the ~164 gray class references across components — they simply render warmer. Only `bg-white` surface backgrounds (~45 occurrences) need explicit replacement with `bg-cream`.

## Warm Gray Scale

| Token    | Current (cool) | Proposed (warm) |
| -------- | -------------- | --------------- |
| gray-50  | #f9fafb        | #FAF9F7         |
| gray-100 | #f3f4f6        | #F4F2EE         |
| gray-200 | #e5e7eb        | #E8E5DF         |
| gray-300 | #d1d5db        | #D6D2CB         |
| gray-400 | #9ca3af        | #A8A29B         |
| gray-500 | #6b7280        | #787069         |
| gray-600 | #4b5563        | #575049         |
| gray-700 | #374151        | #443D37         |
| gray-800 | #1f2937        | #292421         |
| gray-850 | #131921        | #1F1B18         |
| gray-900 | #111827        | #1A1714         |
| gray-950 | #030712        | #0F0D0B         |

## Cream Surface Token

- `cream`: #FEFDFB — barely warm white for surface backgrounds
- Replaces `bg-white` on cards, panels, body, nav backdrops
- `text-white` stays pure white (text on colored surfaces)
- `bg-white/80` (frosted nav) becomes `bg-cream/80`

## Unchanged

- **Pink accent** (pink-600/pink-500): Harmonizes better against warm grays without changes
- **Code blocks**: Hardcoded GitHub theme colors (#24292e, #e1e4e8) stay as-is
- **Semantic colors**: Blue links, green/red/amber feedback, violet/emerald highlights stay
- **Canvas animation colors**: Dynamic RGB values in AI grid animation stay

## Scope

1. `styles.css` — define warm gray scale + cream in @theme, update body base styles
2. ~10 component files — replace `bg-white` surface backgrounds with `bg-cream`
3. `styles.css` — update any hardcoded white in CSS (gradient masks)
