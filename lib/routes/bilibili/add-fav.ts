import { Route } from '@/types';
import got from '@/utils/got';
import { config } from '@/config';

export const route: Route = {
    path: '/add-fav/:uid/:aid',
    // example: '/bilibili/add-fav/2951298/1004606622',
    example: '/bilibili/add-fav/2951298/1605891529',
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
// eab_x = 1 111
// eab_x = 2
const FORM_PARAMS = {
    // rid: 1004606622,
    type: 2,
    add_media_ids: '64708498',
    // del_media_ids: ,
    platform: 'web',
    eab_x: 1, // 1 OR 2, 不知道干嘛的
    // eab_x: 2, // 1
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
    // console.log('##', `https://www.bilibili.com/video/av${aid}`);
    const url = `https://www.bilibili.com/video/av${aid}`;
    let response = await got({
        method: 'post',
        url: `https://api.bilibili.com/x/v3/fav/resource/deal`,
        headers,
        body: form,
    });

    if (response?.data?.code === -1) {
        // form 的 eab_x 改为 2
        form.set('eab_x', '2');
        response = await got({
            method: 'post',
            url: `https://api.bilibili.com/x/v3/fav/resource/deal`,
            headers,
            body: form,
        });
    }

    return {
        title: `Bilibili - Add Fav`,
        link: url,
        description: 'Bilibili - Add Fav',
        item: [
            {
                title: 'Add Fav',
                link: ``,
                pubDate: new Date(),
                description: JSON.stringify(response?.data?.code),
            },
        ],
    };
}
