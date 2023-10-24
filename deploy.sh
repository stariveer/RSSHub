#!/bin/bash
# 网站的代码仓库目录
# input="website"
# Nginx 中配置的网站的 HTML 根目录
# output="/www/wwwroot/images.trainspott.in"
# cd $input
# git pull
# hugo
# cd ..
# cp -r $input/public/* $output

SITE_PATH='/www/wwwroot/rsshub.trainspott.in'

cd $SITE_PATH
echo "hehe1"
git reset --hard origin/master
git clean -f
git pull
git checkout master
pm2 restart rsshub

sh pwd
echo "hehe"
