import { Route } from '@/types';
import got from '@/utils/got';
import { config } from '@/config';

export const route: Route = {
    path: '/add-fav/:uid/:aid',
    example: '/bilibili/add-fav/2951298/1004606622',
    parameters: {
        uid: '用户 uid',
        aid: '视频 aid',
    },
    name: '添加到默认收藏夹',
    maintainers: ['srr'],
    handler,
    description: ``,
};

function getBiliJct(str) {
    const match = str.match(/bili_jct=([^;]*)/);
    return match ? match[1] : null;
}

const FORM_PARAMS = {
    // rid: 1004606622,
    type: 2,
    add_media_ids: '64708498',
    // del_media_ids: ,
    platform: 'web',
    eab_x: 1,
    // ramval: 106,
    ga: 1,
    gaia_source: 'web_normal',
    // csrf: 0d55a8544346d32805bf9aeb34352ebd
};

async function handler(ctx) {
    const uid = String(ctx.req.param('uid'));
    const aid = String(ctx.req.param('aid'));
    const cookie = config.bilibili.cookies[uid];
    const headers = { Cookie: cookie };
    const csrf = getBiliJct(cookie);
    const form = new URLSearchParams();
    for (const key of Object.keys(FORM_PARAMS)) {
        form.append(key, String(FORM_PARAMS[key]));
    }
    form.append('rid', aid);
    form.append('csrf', csrf);
    form.append('ramval', String(Math.floor(Math.random() * 100) + 1));
    // console.log('##form', form);
    // const response =
    await got({
        method: 'post',
        url: `https://api.bilibili.com/x/v3/fav/resource/deal`,
        headers,
        body: form,
    });
    // console.log('##response', response);
    return {
        title: `Bilibili - Add Fav`,
        link: ``,
        description: 'Bilibili - Add Fav',
        item: [
            {
                title: 'Add Fav',
                link: ``,
                pubDate: new Date(),
                description: 'Add Fav',
            },
        ],
    };
}
