import { Route } from '@/types';
import got from '@/utils/got';
import cache from './cache';
import { config } from '@/config';
import utils from './utils';
import ConfigNotFoundError from '@/errors/types/config-not-found';

export const route: Route = {
    path: '/followings/video/:uid/:disableEmbed?',
    categories: ['social-media'],
    example: '/bilibili/followings/video/2951298',
    parameters: { uid: '用户 id', disableEmbed: '默认为开启内嵌视频, 任意值为关闭' },
    features: {
        requireConfig: [
            {
                name: 'BILIBILI_COOKIE_*',
                description: `BILIBILI_COOKIE_{uid}: 用于用户关注动态系列路由，对应 uid 的 b 站用户登录后的 Cookie 值，\`{uid}\` 替换为 uid，如 \`BILIBILI_COOKIE_2267573\`，获取方式：
    1.  打开 [https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=0&type=8](https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=0&type=8)
    2.  打开控制台，切换到 Network 面板，刷新
    3.  点击 dynamic_new 请求，找到 Cookie
    4.  视频和专栏，UP 主粉丝及关注只要求 \`SESSDATA\` 字段，动态需复制整段 Cookie`,
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '用户关注视频动态',
    maintainers: ['LogicJake'],
    handler,
    description: `:::warning
  用户动态需要 b 站登录后的 Cookie 值，所以只能自建，详情见部署页面的配置模块。
  :::`,
};

async function handler(ctx) {
    const uid = String(ctx.req.param('uid'));
    const disableEmbed = ctx.req.param('disableEmbed');
    const name = await cache.getUsernameFromUID(uid);

    const isDev = process.env.NODE_ENV === 'dev';

    const domain = isDev ? 'http://localhost:1200' : 'https://rsshub.trainspott.in';
    // console.log('##domain', domain);
    const cookie = config.bilibili.cookies[uid];
    // console.log('##cookie', cookie);
    if (cookie === undefined) {
        throw new ConfigNotFoundError('缺少对应 uid 的 Bilibili 用户登录后的 Cookie 值');
    }

    const dynamicUrl = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=${uid}&type=8`;
    // console.log('##dynamicUrl', dynamicUrl);

    const response = await got({
        method: 'get',
        url: dynamicUrl,
        headers: {
            Referer: `https://space.bilibili.com/${uid}/`,
            Cookie: cookie,
        },
    });
    if (response.data.code === -6) {
        throw new ConfigNotFoundError('对应 uid 的 Bilibili 用户的 Cookie 已过期');
    }
    // console.log('##response', response);
    const cards = response.data.data.cards;

    const out = cards.map((card) => {
        const card_data = JSON.parse(card.card);

        const style = `font-size:60px; cursor:pointer; background-color:#4b9ae9; padding:40px 0; flex: 1; border: 1px solid #ccc; border-radius: 5px; `;
        const onclickLater = `fetch('${domain}/bilibili/add-later/${uid}/${card_data.aid}')`;
        // const onclickFav = `fetch('${domain}/bilibili/add-fav/fav/${uid}/${card_data.aid}')`;
        // const onclickShare = `fetch('${domain}/bilibili/add-fav/share/${uid}/${card_data.aid}')`;
        // .then(response => response.text()).then(result => alert(result))
        const buttonTextLater = `<button style="${style}" onclick="${onclickLater}">听</button>`;
        // const buttonTextFav = `<button style="${style}" onclick="${onclickFav}">看</button>`;
        // const buttonTextShare = `<button style="${style}" onclick="${onclickShare}">享</button>`;

        return {
            title: card_data.title,
            description: `${card_data.desc}${disableEmbed ? '' : `<br><br>${utils.iframe(card_data.aid)}`}<br><div style="display:flex">${buttonTextLater}<br></div><img src="${card_data.pic}">`,
            pubDate: new Date(card_data.pubdate * 1000).toUTCString(),
            link: card_data.pubdate > utils.bvidTime && card_data.bvid ? `https://www.bilibili.com/video/${card_data.bvid}` : `https://www.bilibili.com/video/av${card_data.aid}`,
            author: card.desc.user_profile.info.uname,
        };
    });

    return {
        title: `${name} 关注视频动态`,
        link: `https://t.bilibili.com/?tab=8`,
        item: out,
    };
}
