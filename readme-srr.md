npm run build
npm run start

```

# TEST

-   http://127.0.0.1:1200/jandan-wlt-v2/wlt
-   http://127.0.0.1:1200/smzdm/all-in-one
-   http://127.0.0.1:1200/bilibili/followings/video/2951298
-   http://127.0.0.1:1200/btnull/cn/7/3
-   http://127.0.0.1:1200/dapenti/tugua
-   http://127.0.0.1:1200/douban/recommended/movie
-   http://127.0.0.1:1200/edumails

-   http://127.0.0.1:1200/bilibili/add-later/2951298/1203613609
-   http://127.0.0.1:1200/bilibili/add-fav/2951298/1203613609

## online

-   https://rsshub.trainspott.in/jandan-wlt-v2/wlt
-   https://rsshub.trainspott.in/smzdm/all-in-one
-   https://rsshub.trainspott.in/bilibili/followings/video/2951298
-   https://rsshub.trainspott.in/btnull/cn/7/3
-   https://rsshub.trainspott.in/dapenti/tugua
-   https://rsshub.trainspott.in/douban/recommended/movie
-   https://rsshub.trainspott.in/edumails

-   https://rsshub.trainspott.in/bilibili/add-later/2951298/1203613609
-   https://rsshub.trainspott.in/bilibili/add-fav/2951298/1203613609

## 部署

### bilibili

#### 自动化扫码续期（推荐）

系统已内置全自动扫码登录与 Cookie 管理逻辑。当请求 Bilibili 路由触发风控限制（-352）或 Cookie 失效时，只需在浏览器直接访问该 RSS 路由（例如：`http://localhost:1200/bilibili/user/video/90183256`）。
此时页面将不再返回报错，而是自动展示一个 B 站登录二维码。
1. 使用**手机 B 站 App** 扫描二维码。
2. 在手机端点击“确认登录”。
3. 网页将自动检测到登录成功，刷新获取新的 Cookie 并安全保存在根目录的 `bilibili-cookies.yml` 中。
4. 页面自动重载，恢复原有的 RSS 订阅输出。

#### 环境变量手动配置（备选方案）

-   `BILIBILI_COOKIE_{uid}`: 对应 uid 的 b 站用户登录后的 Cookie 值，`{uid}` 替换为 uid，如 `BILIBILI_COOKIE_2267573`，获取方式：
-   打开 https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=0&type=8
-   打开控制台，切换到 Network 面板，刷新
-   点击 dynamic_new 请求，找到 Cookie
-   视频和专栏，UP 主粉丝及关注只要求 SESSDATA 字段，动态需复制整段 Cookie

### btnull (教父.com / 原 gying.in)

-   可以通过设置 `BTNULL_DOMAIN` 环境变量来更改所请求的域名，默认值为 `教父.com`。

#### 路由参数

`/btnull/:cate/:score/:year`

| 参数    | 说明                                                                                  | 示例         |
| ------- | ------------------------------------------------------------------------------------- | ------------ |
| `cate`  | 地区分类：`all` 全部 / `cn` 大陆 / `hk` 香港 / `tw` 台湾 / `us` 美国 / `jp` 日本 / `kr` 韩国 | `hk`         |
| `score` | 最低评分（豆瓣），范围 0~10                                                           | `7`          |
| `year`  | 年份筛选，支持两种格式：<br>• **具体年份**（如 `2024`）筛选该年上映的影片<br>• **近N年**（如 `3`）筛选近3年内上映的影片；留空则不限年份 | `3` 或 `2024` |

示例：
- `/btnull/hk/7/3` — 近3年香港评分7分以上
- `/btnull/cn/8/2024` — 2024年大陆评分8分以上
- `/btnull/all/6/` — 不限年份全部地区评分6分以上

```

curl -X GET 'https://www.教父.com/mv?year=2024&region=%E5%A4%A7%E9%99%86&sort=addtime&rrange=7_10' \
 -H 'Host: www.教父.com' \
 -H 'Cookie: PHPSESSID=6isus5dg6g6oum9mvjpk2oa58q; BT_auth=c9d2xgfNWZEuEIFNxYEe8Y9oKcxHnAFwviHMx0bg9WzlkqpFlJ3PSUlTX3wXlAAplTYlxmwBCAIUG172gtZ93SXbC7IoTIP7MOdrr85qjiRYZN0uxuqyiIvkY5KEsBbJwL1h7NOy6CmEg96VJyph_cK-TONBUvMReqAl5lJ1bg; BT_cookietime=8f45ky9qw3iIZSiLkeB76Fyn132CgdcdYnrsUsVcCHVPPTsJqAUK; vrg_sc=0898759f3ba639a7867acb0fe64eadca; vrg_go=1' \
 -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'

````

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
````

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
