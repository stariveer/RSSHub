import { Route } from '@/types';
import got from '@/utils/got';
import { config } from '@/config';
import { sleep } from 'telegram/Helpers';

export const route: Route = {
    path: '/add-fav/:folder/:uid/:aid',
    // example: '/bilibili/add-fav/2951298/1004606622',
    example: '/bilibili/add-fav/share/2951298/1605891529',
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

function getRam() {
    return String(Math.floor(Math.random() * 100) + 1);
}

// eab_x = 1 111
// eab_x = 2
const FORM_PARAMS = {
    // rid: 1004606622,
    type: 2,
    // add_media_ids: '64708498', // 默认
    // add_media_ids: '3234771898', // fav
    del_media_ids: '',
    platform: 'web',
    eab_x: 1, // 1 OR 2, 不知道干嘛的
    // eab_x: 2, // 1
    ramval: 32,
    ga: 1,
    gaia_source: 'web_normal',
    // csrf: 0d55a8544346d32805bf9aeb34352ebd
};

const folderNameIdMap = {
    default: '64708498',
    fav: '3234771898',
    share: '3207800398',
};

async function handler(ctx) {
    const uid = String(ctx.req.param('uid'));
    const aid = String(ctx.req.param('aid'));
    const folder = String(ctx.req.param('folder'));
    const folderId = folderNameIdMap[folder] || folderNameIdMap.default;
    const cookie = config.bilibili.cookies[uid];
    const headers = { Cookie: cookie };
    const csrf = getBiliJct(cookie);
    const form = new URLSearchParams();
    for (const key of Object.keys(FORM_PARAMS)) {
        form.append(key, String(FORM_PARAMS[key]));
    }
    form.append('add_media_ids', folderId);
    form.append('rid', aid);
    form.append('csrf', csrf);
    form.append('ramval', getRam());
    // console.log('##form', form);
    // console.log('##', `https://www.bilibili.com/video/av${aid}`);
    const url = `https://www.bilibili.com/video/av${aid}`;
    let response = await got({
        method: 'post',
        url: `https://api.bilibili.com/x/v3/fav/resource/deal`,
        headers,
        body: form,
    });
    // console.log('##response1', form, response?.data?.code === 0);
    await sleep(777);
    if (response?.data?.code !== 0) {
        // form 的 eab_x 改为 2
        form.set('eab_x', '2');
        form.set('ramval', getRam());
        // console.log('##response2', form, response);
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
