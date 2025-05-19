```
npm run build
npm run start
```

# TEST

-   http://localhost:1200/jandan-wlt-v2/wlt
-   http://localhost:1200/btnull/cn/7/2024
-   http://localhost:1200/smzdm/all-in-one
-   http://localhost:1200/bilibili/followings/video/2951298

-   http://localhost:1200/bilibili/add-later/2951298/1203613609
-   http://localhost:1200/bilibili/add-fav/2951298/1203613609

## online
- https://rsshub.trainspott.in/btnull/cn/7/2024

## 部署

### bilibili

#### 用于用户关注动态系列路由

-   BILIBILI*COOKIE*{uid}: 对应 uid 的 b 站用户登录后的 Cookie 值，{uid} 替换为 uid，如 BILIBILI_COOKIE_2267573，获取方式：
-   打开 https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=0&type=8
-   打开控制台，切换到 Network 面板，刷新
-   点击 dynamic_new 请求，找到 Cookie
-   视频和专栏，UP 主粉丝及关注只要求 SESSDATA 字段，动态需复制整段 Cookie

