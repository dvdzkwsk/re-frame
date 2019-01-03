#!/bin/bash
# collect files to be published
version=$1
dist_files=$(ls dist/*.js | xargs basename)

# remove files that are copied over just for publishing
clean () {
  for file in $dist_files; do
    [ -e $file ] && rm $file
  done
}

on_error () {
  err_code=$?
  clean
  exit $err_code
}

# handle any error that occurs
trap on_error ERR

# copy emitted files to package root
for file in $dist_files; do
  cp "dist/$file" .
done

# verify that all files listed in package.json actually exist
for file in $(cat package.json | jq -c -r '.files[]'); do
  if [ ! -e $file ]; then
    echo "Missing file: $file. Did you forget to `yarn build`?"
    exit 1
  fi
done

# ensure that entry point works for both "development" and "production"
NODE_ENV={development,production} node -r esm -e "require('.')"

# validation complete, publish to NPM
npm version $1
npm publish

# publish was successful; clean up
clean
