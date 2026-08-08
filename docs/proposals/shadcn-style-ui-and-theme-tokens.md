# Styling `@foldkit/ui` with `cva`, and a theme-token contract

Status: proposal (companion to issue #627)

This document proposes two small, framework-neutral additions to core that unblock a shadcn-style styled component ecosystem on top of `@foldkit/ui`, without putting any opinionated styling into the framework itself:

1. a documented CSS-variable **theme-token contract**, and
2. a short **"styling `@foldkit/ui` with `cva`"** guide (the recipe below).

The opinionated styled components and their distribution (a shadcn-style registry + CLI) are intended to live in a separate companion project, not in core. See #627 for the full rationale.

## Background

`@foldkit/ui` primitives delegate their look to the consumer through `toView`. That seam is the same role Radix UI plays under shadcn/ui: behavior and accessibility live in the primitive, the class recipe lives in user space. shadcn's styling utilities (`cva`, `clsx`, `tailwind-merge`) are plain string logic and are framework-agnostic, so a shadcn recipe ports to Foldkit by keeping the recipe and swapping only the render layer (JSX to Foldkit `h` + `toView`).

## Recipe: a shadcn-style Button over `@foldkit/ui`

```ts
import { type VariantProps, cva } from 'class-variance-authority'
import { type Html, html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { cn } from './cn' // clsx + tailwind-merge, the shadcn helper, verbatim

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonConfig<Message> = Readonly<{
  label: ReadonlyArray<Html> | string
  onClick?: Message
  isDisabled?: boolean
  variant?: NonNullable<VariantProps<typeof buttonVariants>['variant']>
  size?: NonNullable<VariantProps<typeof buttonVariants>['size']>
  class?: string
}>

export const button = <Message>(config: ButtonConfig<Message>): Html => {
  const h = html<Message>()
  const children = typeof config.label === 'string' ? [config.label] : config.label
  return Button.view<Message>({
    onClick: config.onClick,
    isDisabled: config.isDisabled,
    toView: (attributes) =>
      h.button(
        [
          ...attributes.button,
          h.Class(cn(buttonVariants({ variant: config.variant, size: config.size }), config.class)),
        ],
        children,
      ),
  })
}
```

Call site, plug-and-play like React shadcn:

```ts
button({ label: 'Delete', variant: 'destructive', onClick: ClickedDelete() })
```

The same shape covers the other stateless render helpers (Input, Textarea, Select, Badge, Card). Stateful components (Dialog, Menu, Combobox, Tabs) keep their Submodel in `@foldkit/ui` and only ship a styled `toView` recipe, so they remain single-file drops rather than copies of a state machine.

## Theme-token contract

A registry needs a stable set of CSS-variable names to style against. This is the one piece that genuinely belongs in core, because it is neutral: it names slots, not colors. Recipes reference these via Tailwind v4 theme colors (`bg-primary`, `text-primary-foreground`, `border-input`, `ring-ring`, and so on). Proposed contract:

| Token | Role |
| --- | --- |
| `--background` / `--foreground` | app surface and default text |
| `--primary` / `--primary-foreground` | primary action |
| `--secondary` / `--secondary-foreground` | secondary surface |
| `--muted` / `--muted-foreground` | muted surface and text |
| `--accent` / `--accent-foreground` | hover and highlight surface |
| `--destructive` / `--destructive-foreground` | destructive action |
| `--border` | default border |
| `--input` | form-control border |
| `--ring` | focus ring |
| `--radius` | corner radius scale |

These are the shadcn slot names. Adopting them verbatim means shadcn themes (and the themes at ui.shadcn.com) apply to a Foldkit app unchanged, and any Foldkit registry themes against the same names.

## Scope of this PR

Draft, docs-only. It adds this proposal document. If the direction in #627 is accepted, the natural follow-ups are:

- a website guide page mirroring the recipe above (in `packages/website`),
- shipping the token-contract defaults with `create-foldkit-app`,
- a `create-foldkit-app --ui <registry>` integration point.

Opened as a draft so a maintainer can place and word it to taste.
