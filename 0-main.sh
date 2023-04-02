#!/bin/bash

for filename in ./bucket/*.json; do
  node ./1-patch.mjs $filename
  # node ./healthcheck.mjs $filename
done
