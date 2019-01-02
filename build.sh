#!/bin/bash
clean () {
  rm -rf dist
}

on_error () {
  err_code=$?
  clean
  exit $err_code
}

# handle any error that occurs
trap on_error ERR

# remove any previously-built artifcts
clean

# bundle the library
yarn rollup lib/index.js --format esm --file dist/re-frame.js

# create development bundle
cp dist/re-frame.js dist/development.js
sed -i 's/__DEV__/true/g' dist/development.js

# create production bundle
cp dist/re-frame.js dist/production.js
sed -i 's/__DEV__/false/g' dist/production.js
yarn uglifyjs --compress --mangle --toplevel --output dist/production.js dist/production.js

# remove the original bundle, since we just want development and production variants
rm dist/re-frame.js
