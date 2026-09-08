# Website | Fonts

## ABC Favorit

ABC Favorit sets headings and the landing page display text. It is licensed
for `foldkit.dev` and is not distributed in this repository. Local development
falls back to the system sans-serif stack when the licensed files are absent.

License holders can place these files in `packages/website/public/fonts/` to
match production:

- `ABCFavorit-Book.woff2`
- `ABCFavorit-Light.woff2`

Production restores the files from encrypted GitHub Actions secrets by running
`scripts/restore-website-fonts.sh` before building the website.

## Paper Mono

Code is set in Paper Mono, which is free under the SIL Open Font License and
is checked in as `PaperMono-Variable.woff2` beside its license text,
`PaperMono-OFL.txt`. The variable file carries every weight, so the site picks
its code weights in `src/styles.css` without any further files.

## Inter

Inter sets body copy, labels, and interface text. It is free under the SIL Open
Font License, so a Latin subset of the variable file is checked in at
`packages/website/public/fonts/Inter-Variable.woff2` with its license beside
it. Regenerate the subset from the upstream `InterVariable.woff2` with
`fontTools.subset`, keeping both the `opsz` and `wght` axes and the Latin,
Latin Extended, general punctuation, currency, arrows, mathematical operators,
technical, geometric shapes, and dingbats ranges.
