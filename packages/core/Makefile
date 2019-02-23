.PHONY: build clean check bundle

build: clean check bundle

clean:
	rm -rf dist

check:
	tsc

bundle:
	npx rollup -c

  # do not use brace expansion or TravisCI will barf
	cp README.md dist
	cp LICENSE dist
	cp package.json dist
