const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');
const dayjs = require('dayjs');
const atob = require('atob');
const data = require('./data.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const version = '0204-deploy-6';

const getOne = async (link, zhiParam, rateParam, days, exclude) => {
    const response = await got(link, {
        headers: {
            Referer: 'https://search.smzdm.com',
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
                    const today = dayjs().format('YYYY-MM-DD');
                    if (datetime.indexOf(':') === -1) {
                        // 往年
                        datetime = dayjs(`${datetime} 00:00`);
                    } else if (datetime.indexOf('-') === -1) {
                        // 今天
                        datetime = dayjs(`${today} ${datetime}`);
                    } else {
                        // 今年
                        datetime = dayjs(`${thisYear} ${datetime}`);
                    }
                    datetime = datetime.format('YYYY-MM-DD HH:mm');
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

    const items = [
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

                const isZhiCount = () => {
                    const zhiSet = zhiParam && zhiParam !== '-' ? Number(zhiParam) : 10;
                    return Number(zhi) > zhiSet;
                };

                const isZhiRate = () => {
                    const rateSet = rateParam && rateParam !== '-' ? Number(rateParam) : 0.5;
                    return Number(zhi) / (Number(zhi) + Number(buzhi)) > rateSet;
                };

                // if (index === 0) {
                //     console.log('==item', '\n', item);
                //     console.log('==zhiParam', '\n', zhiParam);
                // }
                // 最近三天
                const isInTime = dayjs(pubDate).isAfter(dayjs().subtract(days && days !== '-' ? Number(days) : 3, 'day'));
                return !isExclude && isZhiCount() && isZhiRate() && isInTime;
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

    return items;
};

module.exports = async (ctx) => {
    // const { query, params } = ctx;
    // const { keyword, exclude, zhiParam, rateParam, days } = params;
    // const { min_price, max_price } = query;

    // if (query.s) {
    //     delete query.s;
    // }

    // let title = query.showTitle || keyword;
    // if (exclude && exclude !== '-') {
    //     title += `·排除"${exclude}"`;
    // }
    // if (zhiParam && zhiParam !== '-') {
    //     title += `·值大于${zhiParam}`;
    // }
    // if (rateParam && rateParam !== '-') {
    //     title += `·好评率大于${rateParam * 100}%`;
    // }
    // if (days && days !== '-') {
    //     title += `·${days}天内`;
    // }

    // if (min_price && max_price) {
    //     title += `·${min_price}-${max_price}元`;
    // } else if (max_price) {
    //     title += `·低于${max_price}`;
    // } else if (min_price) {
    //     title += `·高于${min_price}元`;
    // }
    // const link =
    //     `https://search.smzdm.com/?s=${encodeURIComponent(keyword)}&` +
    //     Object.keys(query)
    //         .filter((key) => key !== 'showTitle')
    //         .map((key) => `${key}=${query[key]}`)
    //         .join('&');

    let res = [];

    await Promise.all(
        data.map(async (url, index) => {
            const custom_params = url.split('&custom_params=')[1];
            const custom_params_obj = JSON.parse(atob(custom_params));
            const { zhiParam, rateParam, days, exclude } = custom_params_obj;
            await sleep(100 * index);
            const a = await getOne(url.split('&custom_params=')[0], zhiParam, rateParam, days, exclude);
            // const a = '';
            return a;
        })
    ).then((all) => {
        all.forEach((i) => {
            res = [...res, ...i];
        });
    });

    ctx.state.data = {
        title: `smzdm.com all in one [${version}]`,
        link: 'https://smzdm.com',
        item: res.length
            ? res
            : [
                  {
                      title: 'hello world',
                      description: 'hello world',
                      pubDate: '2023-01-01T00:00:00.000Z',
                      link: 'https://www.baidu.com',
                  },
              ],
    };
};
