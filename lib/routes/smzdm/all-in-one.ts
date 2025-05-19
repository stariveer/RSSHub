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

// 使用从 curl 命令中获取的完整 cookie
const staticCookie =
    '__ckguid=xKf6auarRA4iWq32QnkL5UJ6; device_id=21307064331741669064484391b32a2090361b21cceb48fa04c7a46d34; homepage_sug=a; r_sort_type=score; Hm_lvt_9b7ac3d38f30fe89ff0b8a0546904e58=1747634342; HMACCOUNT=F57ECB25060C55D5; ss_ab=ss84; ssmx_ab=mxss38; s_his=%E5%BF%83%E7%9B%B8%E5%8D%B0%2C180g%20%E5%8D%B7%E7%BA%B8%2C%E9%A4%90%E5%B7%BE%E7%BA%B8; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%222845538431%22%2C%22first_id%22%3A%221958390e47f1f62-072afb93476d5a8-1c525636-1930176-1958390e4802f1c%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_landing_page%22%3A%22https%3A%2F%2Fsearch.smzdm.com%2F%3Fc%3Dhome%26s%3Ddolce%2Bgusto%2B%E8%83%B6%E5%9B%8A%26order%3Dtime%26custom_params%3DeyJ6aGlQYXJhbSI6NSwicmF0ZVBhcmFtIjowLjcsImRheXMiOjUwfQ%3D%3D%26v%3Db%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODM5MGU0N2YxZjYyLTA3MmFmYjkzNDc2ZDVhOC0xYzUyNTYzNi0xOTMwMTc2LTE5NTgzOTBlNDgwMmYxYyIsIiRpZGVudGl0eV9sb2dpbl9pZCI6IjI4NDU1Mzg0MzEifQ%3D%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%222845538431%22%7D%2C%22%24device_id%22%3A%221958390e47f1f62-072afb93476d5a8-1c525636-1930176-1958390e4802f1c%22%7D; Hm_lpvt_9b7ac3d38f30fe89ff0b8a0546904e58=1747640989; w_tsfp=ltvuV0MF2utBvS0Q7a3vkEunHz8ucTw4h0wpEaR0f5thQLErU5mB1oB+vsL+OHDb4cxnvd7DsZoyJTLYCJI3dwNGQJrCJ4tFig/EwYMi3Y0TUhMyR5rYC1AbIOgj7WRGdXhCNxS00jA8eIUd379yilkMsyN1zap3TO14fstJ019E6KDQmI5uDW3HlFWQRzaLbjcMcuqPr6g18L5a5TfctA/9Kll9A70ThUWW0SlMD3sq4BK4dbwONR2pIs39SqA=';

// link 参数现在应该是包含 custom_params 的完整 URL
const getOne = async (fullLink: string, zhiParam: string, rateParam: string, days: string, exclude: string): Promise<Item[]> => {
    const response = await got(fullLink, {
        // 使用 fullLink作为请求 URL
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,fr;q=0.5,uk;q=0.4,ht;q=0.3,la;q=0.2,pt;q=0.1',
            'cache-control': 'no-cache',
            cookie: staticCookie, // 使用上面定义的完整 cookie
            pragma: 'no-cache',
            referer: fullLink, // Referer 也使用 fullLink
            'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
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
                    link: item.find('.feed-block-title a').attr('href') || '',
                    zhi,
                    buzhi,
                    star,
                    comment,
                    datetime,
                };
            })) ||
        [];

    const items: Item[] = origItems
        .filter((item) => {
            const { title, zhi, buzhi, pubDate, comment, star } = item;
            const isExclude =
                exclude &&
                exclude !== '-' &&
                exclude.split('+').some((e) => {
                    if (title.includes(e)) {
                        return true;
                    }
                    return false;
                });

            const isComments5TimeMoreThanZhi = () => Number(comment) > Number(zhi) * 5;

            const isStars5TimeMoreThanZhi = () => Number(star) > Number(zhi) * 5;

            const isZhiCount = () => {
                const zhiSet = zhiParam && zhiParam !== '-' ? Number(zhiParam) : 10;
                return Number(zhi) > zhiSet;
            };

            const isZhiRate = () => {
                const rateSet = rateParam && rateParam !== '-' ? Number(rateParam) : 0.5;
                return Number(zhi) / (Number(zhi) + Number(buzhi)) > rateSet;
            };

            const isInTime = dayjs(pubDate).isAfter(dayjs().subtract(days && days !== '-' ? Number(days) : 3, 'day'));
            return !isExclude && isInTime && (isComments5TimeMoreThanZhi || isStars5TimeMoreThanZhi || (isZhiCount() && isZhiRate()));
        })
        .map((i) => {
            const { title, description, pubDate, link, zhi, buzhi, star, comment, datetime } = i;
            return {
                title,
                description,
                pubDate,
                link,
                zhi,
                buzhi,
                star,
                comment,
                datetime,
            };
        });

    return items;
};

async function handler() {
    let res: Item[] = [];

    await Promise.all(
        urls.map(async (url, index) => {
            // url 是包含 custom_params 的完整 URL
            const custom_params_part = url.split('&custom_params=')[1];
            const custom_params_obj = JSON.parse(atob(custom_params_part));
            const { zhiParam, rateParam, days, exclude } = custom_params_obj;
            await sleep(30 * index);
            // 直接将完整的 url 传递给 getOne
            const a = await getOne(url, zhiParam, rateParam, days, exclude);
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
}

export const route: Route = {
    path: '/all-in-one',
    name: 'smzdm_all_in_one',
    example: '/smzdm/all_in_one/',
    maintainers: [],
    handler,
};
