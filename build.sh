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

clean
NODE_ENV=development yarn rollup -c
NODE_ENV=production yarn rollup -c

# strip comments from development build
sed -i '/^\s*\/\//d' dist/development.js

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
