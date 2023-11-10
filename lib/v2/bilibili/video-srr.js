const got = require('@/utils/got');
const cache = require('./cache');
const utils = require('./utils');
const logger = require('@/utils/logger');

module.exports = async (ctx) => {
    const uid = ctx.params.uid;
    const disableEmbed = ctx.params.disableEmbed;
    const cookie = await cache.getCookie(ctx);
    const verifyString = await cache.getVerifyString(ctx);
    const [name, face] = await cache.getUsernameAndFaceFromUID(ctx, uid);
    // console.log('##cache.getUsernameAndFaceFromUID(ctx, uid)', cache.getUsernameAndFaceFromUID(ctx, uid));

    const getB3 = async () => {
        const response = await got('https://api.bilibili.com/x/frontend/finger/spi', {
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en',
                'Cache-Control': 'max-age=0',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                Cookie: cookie,
            },
        });
        const data = response.data;
        if (data.code) {
            logger.error(JSON.stringify(data.data));
            throw new Error(`Got error code ${data.code} while fetching: ${data.message}`);
        }
        return data.data.b_3;
    };

    const b3 = await getB3();
    const cookies = [
        // `LIVE_BUVID=AUTO8316489779992178`,
        // `buvid_fp_plain=undefined`,
        // `buvid4=6D94845C-F8E7-8608-C249-89205EC6B46F24842-022073017-TOvBUIBjQNMant6RL+4mkw%3D%3D`,
        // `fingerprint=dd5b5be147c43c45f312c38fc2db99a3`,
        // `sid=8g6obu86`,
        // `CURRENT_QUALITY=80`,
        // `CURRENT_FNVAL=4048`,
        // `buvid_fp=ec5f043f589e4115d318e23f61dd7b13`,
        // `CURRENT_PID=8d6dd2b0-c7bb-11ed-bf8a-09fb1e84d669`,
        // `rpdid=|(J|YJuYlmY~0J'uY~mJ)RJ)~`,
        // `buvid3=93FA277C-9FC9-6FA8-30E9-227DB1B5351B14361infoc`,
        `buvid3=${b3}`,
        // `b_nut=1680840214`,
        // `theme_style=light`,
        // `b_lsid=A954F585_18B6B9A6F4C`,
        // `_uuid=AC3810426-6106D-4339-3B8F-5CDC4D58165265074infoc`,
        // `bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2OTg1NzY1NjgsImlhdCI6MTY5ODMxNzMwOCwicGx0IjotMX0.UazSLzt6_4yBiJzxaBdm2NFRFM2p0pFuMPhI5bRhzao`,
        // `bili_ticket_expires=1698576508`,
    ];

    const params = utils.addVerifyInfo(`mid=${uid}&ps=30&tid=0&pn=1&keyword=&order=pubdate&platform=web&web_location=1550101&order_avoided=true`, verifyString);
    const requestUrl = `https://api.bilibili.com/x/space/wbi/arc/search?${params}`;
    const response = await got(requestUrl, {
        headers: {
            Referer: `https://space.bilibili.com/${uid}/video?tid=0&page=1&keyword=&order=pubdate`,
            Cookie: cookies.join(';'),
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        },
    });

    const data = response.data;
    if (data.code) {
        logger.error(JSON.stringify(data.data));
        throw new Error(`Got error code ${data.code} while fetching: ${data.message}`);
    }

    ctx.state.data = {
        title: `${name} 的 bilibili 空间`,
        link: `https://space.bilibili.com/${uid}`,
        description: `${name} 的 bilibili 空间`,
        logo: face,
        icon: face,
        item:
            data.data &&
            data.data.list &&
            data.data.list.vlist &&
            data.data.list.vlist.map((item) => ({
                title: item.title,
                description: `${item.description}${!disableEmbed ? `<br><br>${utils.iframe(item.aid)}` : ''}<br><img src="${item.pic}">`,
                pubDate: new Date(item.created * 1000).toUTCString(),
                link: item.created > utils.bvidTime && item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : `https://www.bilibili.com/video/av${item.aid}`,
                author: name,
                comments: item.comment,
            })),
    };
};
