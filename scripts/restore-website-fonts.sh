#!/usr/bin/env bash

set -euo pipefail

fonts_directory="packages/website/public/fonts"

restore_font() {
  local encoded_font="$1"
  local destination="$2"

  if [[ -z "$encoded_font" ]]; then
    echo "Missing licensed website font secret for $destination." >&2
    exit 1
  fi

  printf '%s' "$encoded_font" | openssl base64 -d -A -out "$destination"

  if [[ "$(head -c 4 "$destination")" != 'wOF2' ]]; then
    rm "$destination"
    echo "Decoded website font is invalid: $destination." >&2
    exit 1
  fi
}

mkdir -p "$fonts_directory"

restore_font \
  "${ABC_FAVORIT_BOOK_WOFF2_BASE64:-}" \
  "$fonts_directory/ABCFavorit-Book.woff2"
restore_font \
  "${ABC_FAVORIT_LIGHT_WOFF2_BASE64:-}" \
  "$fonts_directory/ABCFavorit-Light.woff2"
