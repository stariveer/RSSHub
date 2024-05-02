import { Route } from '@/types';
import got from '@/utils/got';
import cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import dayjs from 'dayjs';
import urls from './urls';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const version = 'car';

interface Item {
    title: string;
    description: string;
    pubDate: Date;
    link: string;
    zhi: string;
    buzhi: string;
    star: string;
    comment: string;
    datetime: any;
}

const getOne = async (link: string, zhiParam: string, rateParam: string, days: string, exclude: string): Promise<Item[]> => {
    const response = await got(link, {
        headers: {
            Referer: encodeURIComponent(link),
        },
    });

    const data = response.data;

    const $ = cheerio.load(data);
    const list = $('.feed-row-wide');
    const origItems: Item[] =
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
                    let tempDateTime = dayjs();
                    if (!datetime.includes(':')) {
                        // 往年
                        tempDateTime = dayjs(`${datetime} 00:00`);
                    } else if (datetime.includes('-')) {
                        // 今年
                        tempDateTime = dayjs(`${thisYear} ${datetime}`);
                    } else {
                        // 今天
                        tempDateTime = dayjs(`${today} ${datetime}`);
                    }
                    datetime = tempDateTime.format('YYYY-MM-DD HH:mm');
                } catch {
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

    const items: Item[] =
        origItems
            .filter((item) => {
                const { title, zhi, buzhi, pubDate } = item;
                const isExclude =
                    exclude &&
                    exclude !== '-' &&
                    exclude.split('+').some((e) => {
                        if (title.includes(e)) {
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
            });

    return items;
};

async function handler() {
    let res: Item[] = [];

    await Promise.all(
        urls.map(async (url, index) => {
            const custom_params = url.split('&custom_params=')[1];
            const custom_params_obj = JSON.parse(atob(custom_params));
            const { zhiParam, rateParam, days, exclude } = custom_params_obj;
            await sleep(30 * index);
            const a = await getOne(url.split('&custom_params=')[0], zhiParam, rateParam, days, exclude);
            return a;
        })
    ).then((all) => {
        for (const i of all) {
            res = [...res, ...i];
        }
    });

    return {
        title: `smzdm.com all in one [${version}]`,
        link: 'https://smzdm.com',
        item: res.length
            ? res
            : [
                  {
                      title: 'hello world',
                      description: 'hello world',
                      pubDate: new Date('2023-01-01T00:00:00.000Z'),
                      link: 'https://trainspott.in',
                  },
              ],
    };
};

export const route: Route = {
    path: '/all-in-one',
    name: 'smzdm_all_in_one',
    example: '/smzdm/all_in_one/',
    maintainers: [],
    handler,
};
