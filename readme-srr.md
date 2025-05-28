```
npm run build
npm run start
```

# TEST

-   http://127.0.0.1:1200/jandan-wlt-v2/wlt
-   http://127.0.0.1:1200/smzdm/all-in-one
-   http://127.0.0.1:1200/bilibili/followings/video/2951298
-   http://127.0.0.1:1200/btnull/cn/7/2024
-   http://127.0.0.1:1200/dapenti/tugua
-   http://127.0.0.1:1200/douban/recommended/movie
-   http://127.0.0.1:1200/edumails

-   http://127.0.0.1:1200/bilibili/add-later/2951298/1203613609
-   http://127.0.0.1:1200/bilibili/add-fav/2951298/1203613609

## online

-   https://rsshub.trainspott.in/jandan-wlt-v2/wlt
-   https://rsshub.trainspott.in/smzdm/all-in-one
-   https://rsshub.trainspott.in/bilibili/followings/video/2951298
-   https://rsshub.trainspott.in/btnull/cn/7/2024
-   https://rsshub.trainspott.in/dapenti/tugua
-   https://rsshub.trainspott.in/douban/recommended/movie
-   https://rsshub.trainspott.in/edumails

-   https://rsshub.trainspott.in/bilibili/add-later/2951298/1203613609
-   https://rsshub.trainspott.in/bilibili/add-fav/2951298/1203613609

## 部署

### bilibili

#### 用于用户关注动态系列路由

-   BILIBILI*COOKIE*{uid}: 对应 uid 的 b 站用户登录后的 Cookie 值，{uid} 替换为 uid，如 BILIBILI_COOKIE_2267573，获取方式：
-   打开 https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=0&type=8
-   打开控制台，切换到 Network 面板，刷新
-   点击 dynamic_new 请求，找到 Cookie
-   视频和专栏，UP 主粉丝及关注只要求 SESSDATA 字段，动态需复制整段 Cookie

### btnull

- 站长歧视大陆ip, 大陆ip要验证人机
- 先开全局代理
- 再proxy_v2_on

```
curl -X GET 'https://www.gying.in/mv?year=2024&region=%E5%A4%A7%E9%99%86&sort=addtime&rrange=7_10' \
  -H 'Host: www.gying.in' \
  -H 'Cookie: PHPSESSID=6isus5dg6g6oum9mvjpk2oa58q; BT_auth=c9d2xgfNWZEuEIFNxYEe8Y9oKcxHnAFwviHMx0bg9WzlkqpFlJ3PSUlTX3wXlAAplTYlxmwBCAIUG172gtZ93SXbC7IoTIP7MOdrr85qjiRYZN0uxuqyiIvkY5KEsBbJwL1h7NOy6CmEg96VJyph_cK-TONBUvMReqAl5lJ1bg; BT_cookietime=8f45ky9qw3iIZSiLkeB76Fyn132CgdcdYnrsUsVcCHVPPTsJqAUK; vrg_sc=0898759f3ba639a7867acb0fe64eadca; vrg_go=1' \
  -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'
```

# 2025-05-28 新功能, 添加 3个按钮, 用于添加到youtube的 稍后听, 默认收藏, 投屏看 3个播放列表

调用添加播放列表的接口如下示例, 需要替换 playlistId 和 videoId:
```zsh
curl --location --request POST 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet' \
--header 'User-Agent: Apifox/1.0.0 (https://apifox.com)' \
--header 'Content-Type: application/json' \
--header 'Authorization: xxx' \
--header 'Accept: */*' \
--header 'Host: www.googleapis.com' \
--header 'Connection: keep-alive' \
--data-raw '{
    "snippet": {
        "playlistId": "PLypxFU_2ioNJDWhBizOhXScHz9NoZiZz8",
        "resourceId": {
            "kind": "youtube#video",
            "videoId": "cp82CYp4xvw"
        }
    }
}'
```

playlistId 可以从环境变量获取
YOUTUBE_PLAYLIST_ID_ADD_LATER 稍后听
YOUTUBE_PLAYLIST_ID_DEFAULT_FAVORITE 默认收藏
YOUTUBE_PLAYLIST_ID_SCREEN_CAST 投屏看

videoId 上下文当中应该可以获取

Authorization 是 google 的 access_token, access_token 是否过期, 需要你判断, 如果过期, 需要用 refresh_token 获取新的 access_token, 参考:

```zsh
curl --location --request POST 'https://oauth2.googleapis.com/token' \
--header 'User-Agent: Apifox/1.0.0 (https://apifox.com)' \
--header 'Content-Type:  application/x-www-form-urlencoded' \
--header 'Accept: */*' \
--header 'Host: oauth2.googleapis.com' \
--header 'Connection: keep-alive' \
--data-urlencode 'client_id=xxx' \
--data-urlencode 'client_secret=xxx' \
--data-urlencode 'refresh_token=xxx' \
--data-urlencode 'grant_type=refresh_token'
```

refresh_token 从环境变量获取
YOUTUBE_REFRESH_TOKEN


我希望你参考/bilibili/user/video/171766569 这个路由的交互, 来添加这3个"按钮", 需要你修改的路由是这个/youtube/channel/UC0Qj2CZsALJRivClNuDStlA




