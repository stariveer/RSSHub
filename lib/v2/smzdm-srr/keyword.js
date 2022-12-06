const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');

module.exports = async (ctx) => {
    const keyword = ctx.params.keyword;
    const min_price = ctx.params.min_price;
    const max_price = ctx.params.max_price;

    const searchParams = {
        c: 'faxian',
        s: keyword,
        order: 'time',
        f_c: 'zhi',
        v: 'b',
        mx_v: 'b',
    };

    let title = `${keyword}-什么值得买·好价·值率>50%`;

    if (min_price) {
        searchParams.min_price = min_price;
        title += `·价格>${min_price}`;
    }

    if (max_price) {
        searchParams.max_price = max_price;
        title += `·价格<${max_price}`;
    }

    const Referer = Object.keys(searchParams)
        .map((key) => {
            const value = searchParams[key];
            if (key === 's') {
                return `${key}=${encodeURIComponent(value)}`;
            } else {
                return `${key}=${value}`;
            }
        })
        .join('&');


    const response = await got(`https://search.smzdm.com`, {
        headers: {
            Referer,
        },
        searchParams
    });

    const data = response.data;

    const $ = cheerio.load(data);
    const list = $('.feed-row-wide');

    ctx.state.data = {
        title,
        link: `https://search.smzdm.com/?c=home&s=${encodeURIComponent(keyword)}&order=time`,
        item:
            list &&
            list.toArray().map((item) => {
                item = $(item);
                return {
                    title: `${item.find('.feed-block-title a').eq(0).text().trim()} - ${item.find('.feed-block-title a').eq(1).text().trim()}`,
                    description: `${item.find('.feed-block-descripe').contents().eq(2).text().trim()}<br>${item.find('.feed-block-extras span').text().trim()}<br><img src="http:${item.find('.z-feed-img img').attr('src')}">`,
                    pubDate: timezone(parseDate(item.find('.feed-block-extras').contents().eq(0).text().trim(), ['MM-DD HH:mm', 'HH:mm']), +8),
                    link: item.find('.feed-block-title a').attr('href'),
                };
            }),
    };
};
