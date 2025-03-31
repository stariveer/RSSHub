import { Route } from '@/types';
import got from '@/utils/got';
import { config } from '@/config';
// import { sleep } from 'telegram/Helpers';

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
    const csrf = getBiliJct(cookie);

    // console.log('请求参数：', { uid, aid, folder, folderId, csrf });

    const formData = new FormData();
    formData.append('rid', aid);
    formData.append('type', '2');
    formData.append('add_media_ids', folderId);
    formData.append('del_media_ids', '');
    formData.append('platform', 'web');
    formData.append('eab_x', '2');
    formData.append('ramval', getRam());
    formData.append('ga', '1');
    formData.append('gaia_source', 'web_normal');
    formData.append('from_spmid', '333.337.search-card.all.click');
    formData.append('spmid', '333.788.0.0');
    formData.append('statistics', JSON.stringify({ appId: 100, platform: 5 }));
    formData.append('csrf', csrf);

    // 打印请求体内容
    // console.log('FormData 内容检查:');
    // for (const pair of formData.entries()) {
    //     console.log(`${pair[0]}: ${pair[1]}`);
    // }

    const headers = {
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        Referer: 'https://space.bilibili.com/' + uid + '/',
        'sec-ch-ua': '"Chromium";v="134", "Not:-Brand";v="24", "Google Chrome";v="134"',
        'sec-fetch-site': 'same-site',
    };

    // console.log('请求头:', headers);

    const url = `https://www.bilibili.com/video/av${aid}`;
    try {
        // console.log('发送请求到:', `https://api.bilibili.com/x/v3/fav/resource/deal`);
        const response = await got({
            method: 'post',
            url: `https://api.bilibili.com/x/v3/fav/resource/deal`,
            headers,
            body: formData,
        });

        // console.log('响应状态码:', response.statusCode);
        // console.log('响应数据:', JSON.stringify(response.data));

        return {
            title: `Bilibili - Add Fav`,
            link: url,
            description: 'Bilibili - Add Fav',
            item: [
                {
                    title: 'Add Fav',
                    link: ``,
                    pubDate: new Date(),
                    description: JSON.stringify(response?.data),
                },
            ],
        };
    } catch {
        // (error)
        // console.error('请求失败:', error.message);
        // if (error.response) {
        //     console.error('错误状态码:', error.response.statusCode);
        //     console.error('错误响应:', error.response.body);
        // }

        // 尝试使用 URLSearchParams 作为备选方案
        // console.log('尝试使用 URLSearchParams 发送请求...');
        const form = new URLSearchParams();
        form.append('rid', aid);
        form.append('type', '2');
        form.append('add_media_ids', folderId);
        form.append('del_media_ids', '');
        form.append('platform', 'web');
        form.append('eab_x', '2');
        form.append('ramval', getRam());
        form.append('ga', '1');
        form.append('gaia_source', 'web_normal');
        form.append('from_spmid', '333.337.search-card.all.click');
        form.append('spmid', '333.788.0.0');
        form.append('statistics', JSON.stringify({ appId: 100, platform: 5 }));
        form.append('csrf', csrf);

        try {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            const response2 = await got({
                method: 'post',
                url: `https://api.bilibili.com/x/v3/fav/resource/deal`,
                headers,
                body: form,
            });

            // console.log('URLSearchParams 响应状态码:', response2.statusCode);
            // console.log('URLSearchParams 响应数据:', JSON.stringify(response2.data));

            return {
                title: `Bilibili - Add Fav`,
                link: url,
                description: 'Bilibili - Add Fav (备选方案)',
                item: [
                    {
                        title: 'Add Fav',
                        link: ``,
                        pubDate: new Date(),
                        description: JSON.stringify(response2?.data),
                    },
                ],
            };
        } catch {
            return {
                title: `Bilibili - Add Fav 失败`,
                link: url,
                description: '添加收藏失败',
            };
        }
    }
}
