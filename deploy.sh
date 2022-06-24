#!/bin/bash

SITE_PATH='/www/wwwroot/rsshub.trainspott.in'

cd $SITE_PATH
git reset --hard origin/master
git clean -f
git pull
git checkout master