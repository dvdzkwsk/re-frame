.PHONY: build clean bundle

build: clean bundle

clean:
	rm -rf dist

bundle:
	mkdir -p dist
	cp lib/interceptors.js dist

	@# do not use brace expansion or TravisCI will barf
	cp LICENSE dist
	cp package.json dist

	@# when built for publishing, the entrypoint is flattened into a single bundle
	@# and placed in the same directory as package.json. Update "main" to point
	@# to the correct path within "dist".
	@# "./lib/re-frame.js" --> "re-frame.js"
	sed -i 's#\./lib/##' dist/package.json
