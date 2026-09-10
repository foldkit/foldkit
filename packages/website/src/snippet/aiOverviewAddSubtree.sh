git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git \
  "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
