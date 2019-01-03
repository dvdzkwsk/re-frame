#!/bin/bash
clean () {
  rm -rf dist
}

on_error () {
  err_code=$?
  clean
  exit $err_code
}

build_development () {
  cp dist/re-frame.js dist/development.js
  sed -i -E 's/__DEV__/true/g' dist/development.js
}

build_production () {
  cp dist/re-frame.js dist/production.js
  sed -i -E 's/__DEV__/false/g' dist/production.js
  yarn uglifyjs --compress --mangle --toplevel --output dist/production.js dist/production.js
}

# handle any error that occurs
trap on_error ERR

# remove any previously-built artifcts
clean
yarn rollup lib/index.js --format esm --file dist/re-frame.js
sed -i '/^\s*\/\//d' dist/re-frame.js

# build environments
build_development
build_production

# create entrypoint to load correct environment
printf "export default process.env.NODE_ENV === 'production'\n\
  ? require('./production.js')\n\
  : require('./development.js')" > dist/re-frame.js

# build succeeded, emit stats.json
printf "{\n\
  \"development\": $(wc -c < dist/development.js | awk '{print $1}'),\n\
  \"development_gzip\": $(gzip -c dist/development.js | wc -c | awk '{print $1}'),\n\
  \"production\": $(wc -c < dist/production.js | awk '{print $1}'),\n\
  \"production_gzip\": $(gzip -c dist/production.js | wc -c | awk '{print $1}')\n\
}" > dist/stats.json
