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

    let title = keyword;


    if (min_price && max_price) {
        searchParams.max_price = max_price;
        searchParams.min_price = min_price;
        title += `·${min_price}-${max_price}元`;
    } else if (max_price) {
        searchParams.max_price = max_price;
        title += `·低于${max_price}`;
    } else if (min_price) {
        searchParams.min_price = min_price;
        title += `·高于${min_price}元`;
    }

    const link = 'https://search.smzdm.com/?' + Object.keys(searchParams)
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
            Referer: link,
        },
        searchParams,
    });

    const data = response.data;

    const $ = cheerio.load(data);
    const list = $('.feed-row-wide');

    ctx.state.data = {
        title,
        link,
        item:
            list &&
            list.toArray().map((item) => {
                item = $(item);
                let zhi = '-';
                let buzhi = '-';
                let star = '-';
                let comment = '-';
                try {
                    zhi = item.find('.z-icon-zhi-o-thin').next().text().trim();
                    buzhi = item.find('.z-icon-buzhi-o-thin').next().text().trim();
                    star = item.find('.z-icon-star-o-thin').next().text().trim();
                    comment = item.find('.feed-btn-comment').text().trim();
                } catch (error) {
                    //
                }

                const pre = `[👍${zhi}·👎${buzhi}·⭐${star}·💬${comment}·]`;

                return {
                    title: `${pre}${item.find('.feed-block-title a').eq(0).text().trim()} - ${item.find('.feed-block-title a').eq(1).text().trim()}`,
                    description: `${item.find('.feed-block-descripe').contents().eq(2).text().trim()}<br>${item.find('.feed-block-extras span').text().trim()}<br><img src="http:${item.find('.z-feed-img img').attr('src')}">`,
                    pubDate: timezone(parseDate(item.find('.feed-block-extras').contents().eq(0).text().trim(), ['MM-DD HH:mm', 'HH:mm']), +8),
                    link: item.find('.feed-block-title a').attr('href'),
                };
            }),
    };
};
