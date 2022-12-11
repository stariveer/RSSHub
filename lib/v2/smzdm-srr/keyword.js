const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');
const dayjs = require('dayjs');

module.exports = async (ctx) => {
    const { query, params } = ctx;
    const { keyword, exclude, zhiParam, rateParam, days } = params;
    const { min_price, max_price } = query;

    let title = query.showTitle || keyword;
    if (min_price && max_price) {
        title += `·${min_price}-${max_price}元`;
    } else if (max_price) {
        title += `·低于${max_price}`;
    } else if (min_price) {
        title += `·高于${min_price}元`;
    }
    const link =
        `https://search.smzdm.com/?s=${encodeURIComponent(keyword)}&` +
        Object.keys(query)
            .filter((key) => key !== 'showTitle')
            .map((key) => `${key}=${query[key]}`)
            .join('&');

    const response = await got(link, {
        headers: {
            Referer: link,
        },
        searchParams: {
            s: keyword,
            ...query,
        },
    });

    const data = response.data;
    // TEMP
    // const data1 = await require('./response.data');

    const $ = cheerio.load(data);
    const list = $('.feed-row-wide');
    const origItems =
        (list &&
            list.toArray().map((i) => {
                const item = $(i);
                let zhi = '-';
                let buzhi = '-';
                let star = '-';
                let comment = '-';
                let datetime = '-';
                try {
                    zhi = item.find('.z-icon-zhi-o-thin').next().text().trim();
                    buzhi = item.find('.z-icon-buzhi-o-thin').next().text().trim();
                    star = item.find('.z-icon-star-o-thin').next().text().trim();
                    comment = item.find('.feed-btn-comment').text().trim();
                    datetime = item.find('.feed-block-extras').contents().eq(0).text().trim();
                    const thisYear = dayjs().format('YYYY');
                    if (datetime.indexOf(':') !== -1) {
                        // 今年
                        datetime = `${thisYear}-${datetime}`;
                    }
                    datetime = dayjs(datetime).format('YYYY-MM-DD HH:mm');
                } catch (error) {
                    //
                }

                const pre = `[👍${zhi}·👎${buzhi}·⭐${star}·💬${comment}·]`;
                return {
                    title: `${pre}${item.find('.feed-block-title a').eq(0).text().trim()} - ${item.find('.feed-block-title a').eq(1).text().trim()}`,
                    description: `${item.find('.feed-block-descripe').contents().eq(2).text().trim()}<br>${item.find('.feed-block-extras span').text().trim()}<br><img src="http:${item.find('.z-feed-img img').attr('src')}">`,
                    pubDate: timezone(parseDate(datetime, ['YYYY-MM-DD HH:mm', 'HH:mm']), +8),
                    link: item.find('.feed-block-title a').attr('href'),
                    zhi,
                    buzhi,
                    star,
                    comment,
                    datetime,
                };
            })) ||
        [];

    // console.log('==origItems', '\n', origItems);
    const items = [
        {
            title: 'hello world',
            description: 'hello world',
            pubDate: '',
            link: '',
        },
        ...origItems
            .filter((item) => {
                const { title, zhi, buzhi, pubDate } = item;
                const isExclude =
                    exclude &&
                    exclude !== '-' &&
                    exclude.split('+').some((e) => {
                        if (title.indexOf(e) !== -1) {
                            return true;
                        }
                        return false;
                    });

                let isZhi = true;

                if (
                    zhi < (zhiParam && zhiParam !== '-' ? Number(zhiParam) : 10) && // 值大于10
                    buzhi / zhi > (rateParam && rateParam !== '-' ? Number(rateParam) : 0.33) // 不值33% 以上不通过
                ) {
                    isZhi = false;
                }

                // 最近三天
                const isInTime = dayjs(pubDate).isAfter(dayjs().subtract(days && days !== '-' ? Number(days) : 3, 'day'));

                return !isExclude && isZhi && isInTime;
            })
            .map((i) => {
                const { title, description, pubDate, link } = i;
                return {
                    title,
                    description,
                    pubDate,
                    link,
                };
            }),
    ];

    ctx.state.data = {
        title,
        link,
        item: items,
    };
};
