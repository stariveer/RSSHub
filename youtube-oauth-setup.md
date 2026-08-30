# YouTube 刷新令牌更新

## 🎯 问题：YOUTUBE_REFRESH_TOKEN 失效

## 🚀 解决方案（3步搞定）

### 1️⃣ 获取客户端密钥

访问您的配置页面，复制客户端密钥：

```
https://console.cloud.google.com/auth/clients/993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com?project=yt-api-test-461206
```

### 2️⃣ 重新获取刷新令牌 🔑

1. 访问 **[OAuth 2.0 Playground](https://developers.google.com/oauthplayground)**

2. 点击右上角设置按钮（⚙️），勾选 **"Use your own OAuth credentials"**

3. 填入凭据：

    - **OAuth Client ID**: `993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com`
    - **OAuth Client secret**: 步骤1复制的密钥

4. 在左侧输入API范围（**注意拼写**，逐行复制）：

```
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube
```

5. 点击 **"Authorize APIs"** → 用您的 Google 账户登录授权

6. 点击 **"Exchange authorization code for tokens"**

7. 复制 **Refresh token** 🎯

### 3️⃣ 更新配置并重启

```bash
# 更新刷新令牌
export YOUTUBE_REFRESH_TOKEN="你刚获得的新刷新令牌"

# 重启 RSSHub，然后测试
# http://localhost:1200/youtube/add-to-playlist/later/dQw4w9WgXcQ
```

---

## 📋 常见错误

-   **`invalid_scope`** → 检查拼写，确保是 `youtube` 不是 `youtub`
-   **`redirect_uri_mismatch`** → 在OAuth客户端中添加 `https://developers.google.com/oauthplayground`

## 🔗 快速链接

-   [您的OAuth客户端](https://console.cloud.google.com/auth/clients/993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com?project=yt-api-test-461206)
-   [OAuth Playground](https://developers.google.com/oauthplayground)
-   [API配额](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas?project=yt-api-test-461206)
