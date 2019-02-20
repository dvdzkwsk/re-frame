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
yarn tsc
yarn rollup -c
