import { Route } from '@/types';
import got from '@/utils/got';
import cache from './cache';
import utils from './utils';
import logger from '@/utils/logger';
import { generateQrCodeKey, generateQrCodeImage } from './qrcode-login';

export const route: Route = {
    path: '/user/video/:uid/:disableEmbed?',
    categories: ['social-media', 'popular'],
    example: '/bilibili/user/video/2267573',
    parameters: { uid: '用户 id, 可在 UP 主主页中找到', disableEmbed: '默认为开启内嵌视频, 任意值为关闭' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['space.bilibili.com/:uid'],
            target: '/user/video/:uid',
        },
    ],
    name: 'UP 主投稿',
    maintainers: ['DIYgod'],
    handler,
    description: `:::tip 动态的专栏显示全文
  可以使用 [UP 主动态](#bilibili-up-zhu-dong-tai)路由作为代替绕过反爬限制
  :::`,
};

/**
 * cookie 失效时，直接在当前 URL 返回 HTML 二维码页面。
 * 通过 ctx.res 直接设置响应，绕过 RSShub 的 RSS 模板中间件。
 * 页面内置 JS 每 2 秒轮询 /bilibili/qrcode/poll，
 * 扫码确认后 cookie 自动写入 bilibili-cookies.yml，页面自动刷新回 RSS 内容。
 */
async function renderQrCodePage(ctx, uid: string) {
    // 清除过期 cookie 缓存
    cache.invalidateYamlCookieCache();

    const qrcodeData = await generateQrCodeKey();
    const qrImage = await generateQrCodeImage(qrcodeData.url);
    const pollUrl = `/bilibili/qrcode/poll?qrcode_key=${qrcodeData.qrcode_key}&uid=${uid}`;

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>B站登录 - Cookie 已过期</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100vh; margin: 0;
      background: linear-gradient(135deg, #fff0f5 0%, #f4f5f7 100%);
    }
    .card {
      background: #fff; border-radius: 16px; padding: 40px 36px;
      box-shadow: 0 8px 32px rgba(251,114,153,.15); text-align: center;
      max-width: 380px; width: 90%;
    }
    h2 { color: #fb7299; margin: 0 0 8px; font-size: 22px; }
    p  { color: #888; margin: 0 0 24px; font-size: 14px; line-height: 1.6; }
    .qr-wrap {
      display: inline-flex; padding: 10px;
      border: 3px solid #fb7299; border-radius: 10px; background: #fff;
    }
    .qr-wrap img { width: 200px; height: 200px; display: block; }
    #status {
      margin-top: 20px; padding: 10px 20px; border-radius: 8px;
      font-size: 14px; background: #f5f5f5; color: #666;
      transition: background .3s, color .3s;
    }
    #status.scanning  { background: #fff8e1; color: #b8860b; }
    #status.confirmed { background: #e8f5e9; color: #2e7d32; }
    #status.success   { background: #e3f2fd; color: #1565c0; }
    #status.error     { background: #ffebee; color: #c62828; }
    #status.expired   { background: #f3e5f5; color: #7b1fa2; }
    .refresh-btn {
      display: none; margin-top: 16px; padding: 8px 24px;
      background: #fb7299; color: #fff; border: none;
      border-radius: 20px; cursor: pointer; font-size: 14px;
    }
    .refresh-btn:hover { background: #f45c8a; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔑 B站 Cookie 已过期</h2>
    <p>请用 <strong>B站 App</strong> 扫描下方二维码重新登录<br>扫码确认后 Cookie 将自动保存，页面将自动刷新</p>
    <div class="qr-wrap">
      <img src="${qrImage}" alt="扫码登录">
    </div>
    <div id="status">⏳ 等待扫码...</div>
    <button class="refresh-btn" id="refreshBtn" onclick="location.reload()">刷新二维码</button>
  </div>
  <script>
    const pollUrl = '${pollUrl}';
    const currentUrl = location.href;
    let polling = true;

    async function poll() {
      if (!polling) return;
      try {
        const res = await fetch(pollUrl);
        const data = await res.json();
        const el = document.getElementById('status');
        const btn = document.getElementById('refreshBtn');

        if (data.code === 86101) {
          el.className = '';
          el.textContent = '⏳ 等待扫码...';
        } else if (data.code === 86090) {
          el.className = 'scanning';
          el.textContent = '📱 已扫码，请在手机上点击确认登录';
        } else if (data.code === 86038) {
          el.className = 'expired';
          el.textContent = '⚠️ 二维码已失效，请点击刷新';
          btn.style.display = 'inline-block';
          polling = false;
        } else if (data.code === 0) {
          el.className = 'success';
          el.textContent = '✅ 登录成功！Cookie 已保存，正在跳转...';
          polling = false;
          setTimeout(() => location.href = currentUrl, 1800);
        } else {
          el.className = 'error';
          el.textContent = '❌ 错误: ' + (data.message || JSON.stringify(data));
        }
      } catch(e) {
        console.error('轮询出错:', e);
      }
      if (polling) setTimeout(poll, 2000);
    }

    poll();
  </script>
</body>
</html>`;

    // 通过 ctx.set('html-response') 通知 template 中间件直接返回该 HTML，跳过 RSS 渲染
    ctx.set('html-response', new Response(html, {
        status: 200,
        headers: { 
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
    }));
}

async function handler(ctx) {
    const uid = ctx.req.param('uid');
    const disableEmbed = ctx.req.param('disableEmbed');

    // ── 第一步：获取用户名/头像，顺便验证 cookie 是否有效 ──
    let name: string | undefined;
    let face: string | undefined;
    try {
        [name, face] = await cache.getUsernameAndFaceFromUID(uid);
    } catch (error: any) {
        if (error.message && error.message.includes('-352')) {
            await renderQrCodePage(ctx, uid);
            return; // 不返回 RSS 数据，让框架用 ctx.res 直接响应
        }
        throw error;
    }


    // ── 第二步：获取视频列表 ──
    const cookie = await cache.getCookie();
    const wbiVerifyString = await cache.getWbiVerifyString();
    const dmImgList = utils.getDmImgList();
    const params = utils.addWbiVerifyInfo(utils.addDmVerifyInfo(`mid=${uid}&ps=30&tid=0&pn=1&keyword=&order=pubdate&platform=web&web_location=1550101&order_avoided=true`, dmImgList), wbiVerifyString);
    const response = await got(`https://api.bilibili.com/x/space/wbi/arc/search?${params}`, {
        headers: {
            Referer: `https://space.bilibili.com/${uid}/video?tid=0&page=1&keyword=&order=pubdate`,
            Cookie: cookie,
        },
    });
    const data = response.data;
    if (data.code) {
        logger.error(`Bilibili search API code ${data.code}: ` + JSON.stringify(data.data));
        if (data.code === -352) {
            logger.error('Debug: video.ts got -352, calling renderQrCodePage');
            await renderQrCodePage(ctx, uid);
            logger.error('Debug: renderQrCodePage finished, ctx.get(html-response)=' + !!ctx.get('html-response'));
            return;
        }
        throw new Error(`Got error code ${data.code} while fetching: ${data.message}`);
    }

    return {
        title: `${name} 的 bilibili 空间`,
        link: `https://space.bilibili.com/${uid}`,
        description: `${name} 的 bilibili 空间`,
        logo: face,
        icon: face,
        item:
            data.data &&
            data.data.list &&
            data.data.list.vlist &&
            data.data.list.vlist.map((item) => {
                const actionButtons = utils.getActionButtons(item.aid);

                return {
                    title: item.title,
                    description: `${item.description}${disableEmbed ? '' : `<br><br>${utils.iframe(item.aid)}`}<br>${actionButtons}<br><img src="${item.pic}">`,
                    pubDate: new Date(item.created * 1000).toUTCString(),
                    link: item.created > utils.bvidTime && item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : `https://www.bilibili.com/video/av${item.aid}`,
                    author: name,
                    comments: item.comment,
                };
            }),
    };
}
