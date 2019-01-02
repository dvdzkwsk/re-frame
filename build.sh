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

# create entrypoint to load correct environment
printf "export default process.env.NODE_ENV === 'production'\n\
  ? require('./production.js')\n\
  : require('./development.js')" > dist/re-frame.js

# ensure that entry point works for both "development" and "production"
NODE_ENV={development,production} node -r esm -e "require('.')"

# build succeeded, emit stats.json
printf "{\n\
  \"development\": $(wc -c < dist/development.js | awk '{print $1}'),\n\
  \"development_gzip\": $(gzip -c dist/development.js | wc -c | awk '{print $1}'),\n\
  \"production\": $(wc -c < dist/production.js | awk '{print $1}'),\n\
  \"production_gzip\": $(gzip -c dist/production.js | wc -c | awk '{print $1}')\n\
}" > dist/stats.json
