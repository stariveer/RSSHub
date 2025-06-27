# YouTube OAuth 刷新令牌更新教程

## 🎯 问题确认

✅ **已确认**：问题是 **YOUTUBE_REFRESH_TOKEN 失效**，不是客户端配置问题。

## 🚀 快速解决方案

### 步骤一：获取客户端密钥

访问您的客户端配置页面，复制完整的客户端密钥：
```
https://console.cloud.google.com/auth/clients/993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com?project=yt-api-test-461206
```

### 步骤二：重新获取刷新令牌 🔑

1. 直接访问 [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)

2. 点击右上角的设置按钮（齿轮图标）

3. 勾选 **"Use your own OAuth credentials"**

4. 输入您的凭据：
   - **OAuth Client ID**: `993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com`
   - **OAuth Client secret**: 从步骤一复制的完整密钥

5. 在左侧选择API范围：

   **范围**（复制整行）：
   ```
   https://www.googleapis.com/auth/youtube.readonly
   https://www.googleapis.com/auth/youtube
   ```
   
   - 点击 **"Authorize APIs"**

6. **重要**：确保用您配置了 YouTube 订阅的 Google 账户登录并授权

7. 在 "Step 2" 中点击 **"Exchange authorization code for tokens"**

8. 复制 **Refresh token**（这是关键的新令牌）

### 步骤四：更新环境变量

```bash
# 直接复制这些命令，替换新的刷新令牌
export YOUTUBE_CLIENT_ID="993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com"
export YOUTUBE_CLIENT_SECRET="你从步骤一复制的完整密钥"
export YOUTUBE_REFRESH_TOKEN="你从步骤三获得的新刷新令牌"

# 或者更新 .env 文件
echo "YOUTUBE_CLIENT_ID=993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com" >> .env
echo "YOUTUBE_CLIENT_SECRET=你的客户端密钥" >> .env  
echo "YOUTUBE_REFRESH_TOKEN=你的新刷新令牌" >> .env
```

### 步骤五：验证修复

1. 重启 RSSHub 服务
2. 测试添加到播放列表功能：
   ```
   http://localhost:1200/youtube/add-to-playlist/later/dQw4w9WgXcQ
   ```
3. 测试订阅列表：
   ```
   http://localhost:1200/youtube/subscriptions
   ```

## 🔧 可能的其他问题

### API 配额检查
访问您的 API 配额页面：
```
https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas?project=yt-api-test-461206
```

### OAuth 同意屏幕检查  
如果仍有问题，检查同意屏幕配置：
```
https://console.cloud.google.com/apis/credentials/consent?project=yt-api-test-461206
```
确保包含以下范围：
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/youtube`

## 播放列表ID配置（可选）

要使用添加到播放列表功能，需要配置播放列表ID。在 YouTube 中创建播放列表后，从URL获取ID：
```
https://www.youtube.com/playlist?list=PLxxxxxx  
# PLxxxxxx 就是播放列表ID
```

```bash
export YOUTUBE_PLAYLIST_ID_ADD_LATER="你的稍后听播放列表ID"
export YOUTUBE_PLAYLIST_ID_DEFAULT_FAVORITE="你的收藏播放列表ID"  
export YOUTUBE_PLAYLIST_ID_SCREEN_CAST="你的投屏播放列表ID"
```

## 故障排除

### 常见错误解决

**❌ 错误：`invalid_scope`**
```
Some requested scopes were invalid. {valid=[...], invalid=[https://www.googleapis.com/auth/youtub]}
```
**✅ 解决**：检查拼写，确保是 `youtube` 不是 `youtub`

**❌ 错误：`redirect_uri_mismatch`**
**✅ 解决**：在您的OAuth客户端设置中添加 `https://developers.google.com/oauthplayground`

**刷新令牌失效的常见原因：**
1. **6个月未使用** - Google 会自动撤销长期未使用的令牌
2. **密码更改** - 更改 Google 账户密码会使令牌失效
3. **安全事件** - Google 检测到异常活动时会撤销令牌
4. **应用状态** - OAuth 应用从"发布"改为"测试"状态

**快速检查列表：**
- [ ] 客户端ID和密钥正确
- [ ] 重定向URI包含 `https://developers.google.com/oauthplayground`
- [ ] **OAuth范围拼写正确**（特别注意 `youtube` 不是 `youtub`）
- [ ] 刷新令牌是最新获取的
- [ ] API配额未超限
- [ ] OAuth同意屏幕包含正确的权限范围

## 预防措施

为避免再次失效：
1. **定期使用** - 至少每3个月使用一次相关功能
2. **监控配额** - 定期检查API使用情况
3. **备份令牌** - 保存有效的刷新令牌作为备份

## 直达链接汇总

- **您的OAuth客户端**: https://console.cloud.google.com/auth/clients/993102370140-a186u54shrdr20ut9gburepjm2v05f3m.apps.googleusercontent.com?project=yt-api-test-461206
- **API配额**: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas?project=yt-api-test-461206  
- **OAuth同意屏幕**: https://console.cloud.google.com/apis/credentials/consent?project=yt-api-test-461206
- **OAuth Playground**: https://developers.google.com/oauthplayground 
