const cheerio = require('cheerio');
const url = require('url');
const got = require('@/utils/got');

const cityDict = {
    北京: 69,
    上海: 25,
    成都: 21,
    广州: 217,
    深圳: 157,
    杭州: 151,
};

const baseUrl = 'https://www.toodaylab.com/';

module.exports = async (ctx) => {
    let city = ctx.params.city;

    if (!city || !Object.keys(cityDict).includes(city)) {
        city = '成都';
    }

    const response = await got({
        method: 'get',
        url: `${baseUrl}/city/${cityDict[city]}`,
    });

    const $ = cheerio.load(response.data);
    const list = $('.content .single-post').get();

    const out = await Promise.all(
        list.map(async (item, index) => {
            // { decodeEntities: false }
            const $ = cheerio.load(item);
            // const image = $('.post-pic a').attr('style').replace('background-image: url(', '').replace(')', '');

            const title = $('.post-info .title a').html();
            const link = url.resolve(baseUrl, $('.post-info .title a').attr('href'));

            const author = $('.left-infos a').text().trim();
            let pubDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * index).toUTCString();
            try {
                const dateText = $('.left-infos p').text().split('//')[1].replace(/ /gi, '');
                const yyyy = new Date().getFullYear();
                const m = dateText.substring(0, dateText.indexOf('月'));
                const d = dateText.substring(dateText.indexOf('月') + 1, dateText.indexOf('日'));

                const HH = dateText.substring(dateText.indexOf('日') + 1, dateText.indexOf(':'));
                const MM = dateText.substring(dateText.indexOf(':') + 1, dateText.length);
                const date = new Date(yyyy, m, d, HH, MM);
                const serverOffset = date.getTimezoneOffset() / 60;
                pubDate = new Date(date.getTime() - 60 * 60 * 1000 * serverOffset).toUTCString();
            } catch (error) {
                // do nothing
            }

            const detail = await got({
                method: 'get',
                url: link,
                headers: {
                    Referer: baseUrl,
                },
            });

            const detailData = detail.data;
            const $detail = cheerio.load(detailData);
            const description = $detail('.post-content').html();

            const cache = await ctx.cache.get(link);

            if (cache) {
                return Promise.resolve(JSON.parse(cache));
            }

            const single = {
                title,
                author,
                // image,
                link,
                description,
                pubDate,
                guid: pubDate,
            };

            ctx.cache.set(link, JSON.stringify(single));

            return Promise.resolve(single);
        })
    );

    ctx.state.data = {
        title: `理想生活实验室 - ${city}`,
        params: {
            title: `理想生活实验室 - ${city}`,
        },
        url: baseUrl,
        link: baseUrl,
        item: out,
    };
};
