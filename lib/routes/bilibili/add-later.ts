import { Route } from '@/types';
import got from '@/utils/got';
import { getUserCookie } from './yaml-config';
import ConfigNotFoundError from '@/errors/types/config-not-found';

export const route: Route = {
    path: '/add-later/:uid/:aid',
    example: '/bilibili/add-later/2951298/1203613609',
    parameters: {
        uid: '用户 uid',
        aid: '视频 aid',
    },
    name: '添加到稍后再看',
    maintainers: ['srr'],
    handler,
    description: ``,
};

function getBiliJct(str) {
    const match = str.match(/bili_jct=([^;]*)/);
    return match ? match[1] : null;
}

async function handler(ctx) {
    const uid = String(ctx.req.param('uid'));
    const aid = String(ctx.req.param('aid'));
    const cookie = getUserCookie(uid);
    if (cookie === undefined) {
        throw new ConfigNotFoundError('缺少对应 uid 的 Bilibili 用户登录后的 Cookie 值');
    }

    const headers = { Cookie: cookie };
    const csrf = getBiliJct(cookie);
    const form = new URLSearchParams();
    form.append('aid', aid);
    form.append('csrf', csrf);

    // const response =
    await got({
        method: 'post',
        url: `https://api.bilibili.com/x/v2/history/toview/add`,
        headers,
        body: form,
    });
    // console.log('##response', response);
    return {
        title: `Bilibili - Add Later`,
        link: ``,
        description: 'Bilibili - Add Later',
        item: [
            {
                title: 'Add Later',
                link: ``,
                pubDate: new Date(),
                description: 'Add Later',
            },
        ],
    };
}
