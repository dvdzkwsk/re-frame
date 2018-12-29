yarn rollup lib/index.js --format esm --file dist/re-frame.js
yarn uglifyjs --compress --mangle --output dist/re-frame.min.js dist/re-frame.js
