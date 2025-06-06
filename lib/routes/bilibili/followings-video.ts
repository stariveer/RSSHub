import { Route } from '@/types';
import got from '@/utils/got';
import cache from './cache';
import utils from './utils';
import ConfigNotFoundError from '@/errors/types/config-not-found';
import { getUserCookie } from './yaml-config';
import logger from '@/utils/logger';

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

    // 使用yaml-config中的getUserCookie函数获取cookie
    const cookie = getUserCookie(uid);
    logger.debug(`Debug cookie for uid ${uid}: ${cookie ? 'Cookie exists' : 'Cookie is empty or undefined'}`);
    if (!cookie) {
        throw new ConfigNotFoundError('B站Cookie不存在，请扫码登录');
    }

    const dynamicUrl = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=${uid}&type=8`;
    logger.debug(`Debug dynamicUrl: ${dynamicUrl}`);

    try {
        const response = await got({
            method: 'get',
            url: dynamicUrl,
            headers: {
                Referer: `https://space.bilibili.com/${uid}/`,
                Cookie: cookie,
            },
        });

        if (response.data.code === -6) {
            throw new ConfigNotFoundError('B站Cookie已过期，请扫码登录');
        }

        // 添加对response.data为undefined或null的处理
        if (!response.data || !response.data.data || !response.data.data.cards) {
            logger.error(`Failed to get data from bilibili API: ${JSON.stringify(response.data)}`);
            throw new Error('获取B站数据失败，可能是cookie无效或API发生变化');
        }

        const cards = response.data.data.cards;

        const out = cards.map((card) => {
            const card_data = JSON.parse(card.card);

            // 使用工具函数生成按钮
            const actionButtons = utils.getActionButtons(card_data.aid);

            return {
                title: card_data.title,
                description: `${card_data.desc}${disableEmbed ? '' : `<br><br>${utils.iframe(card_data.aid)}`}<br>${actionButtons}<br><img src="${card_data.pic}">`,
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
    } catch (error: any) {
        if (error instanceof ConfigNotFoundError) {
            throw error; // 直接抛出特定错误，错误页面会显示二维码登录区域
        } else {
            logger.error(`Error in bilibili followings-video route: ${error}`);
            throw new Error(`获取B站关注视频动态失败: ${error.message}`);
        }
    }
}
