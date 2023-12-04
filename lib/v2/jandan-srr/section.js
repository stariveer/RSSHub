// curl 'http://i.jandan.net/pic' \
//   -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
//   -H 'Accept-Language: en,zh-CN;q=0.9,zh;q=0.8,ja;q=0.7,zh-TW;q=0.6,fr;q=0.5,uk;q=0.4,ht;q=0.3,la;q=0.2,pt;q=0.1' \
//   -H 'Cache-Control: no-cache' \
//   -H 'Connection: keep-alive' \
//   -H 'Cookie: _ga=GA1.1.2115392332.1688523834; _ga_ZDE403EQ65=GS1.1.1688523835.1.1.1688524654.60.0.0; PHPSESSID=h6vnbuui1aq3rlr2br8s9im2ld; _ga_N3LMMZMYDM=GS1.1.1689820041.1.1.1689823126.60.0.0; __gads=ID=7ce438f3a87789a0-22ac6a0187e200a0:T=1688523835:RT=1689823127:S=ALNI_MY0IEuWYwUuTE5pEoDAKcro2N-DCA; __gpi=UID=00000c9680456c8d:T=1688523835:RT=1689823127:S=ALNI_Mb8I_uEO5CJaiPeO-WI1PFR9MhMlw' \
//   -H 'Pragma: no-cache' \
//   -H 'Referer: http://i.jandan.net/' \
//   -H 'Upgrade-Insecure-Requests: 1' \
//   -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' \
//   --compressed \
//   --insecure

// curl 'http://i.jandan.net/pic' \
//     -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'

// https://rsshub.trainspott.in/jandan-srr/pic?image_hotlink_template=https://hello-world-tight-frost-ae52.stariveer.workers.dev/$%7Bprotocol%7D/$%7Bhost%7D$%7Bpathname%7D
// https://hello-world-tight-frost-ae52.stariveer.workers.dev/http:/wx3.moyu.im/large/66dd85f5gy1hjmm0e5zj4j20u0135ad0.jpg

// 现在逻辑是每次遍历3,4,5页
const gotOrig = require('got');
const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');
const config = require('./config');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rootUrl = 'http://i.jandan.net';
// const proxyPrefix = `http://hello-world-tight-frost-ae52.stariveer.workers.dev/http:`;
const proxyPrefix = `http://jandan.trainspott.in/http:`;
const { pages, ignore, ooCount, ooRate, sizeLimit, authorBlackList } = config;

async function getImageSize(url) {
    try {
        const response = await gotOrig.head(`http:${url}`, {
            headers: {
                Referer: 'http://i.jandan.net/',
            },
        });
        const contentLength = response.headers['content-length'];
        // if (contentLength) {
        //     console.log(`Content-Length: ${contentLength} bytes`);
        // } else {
        //     console.log('Content-Length header not present in the response.');
        // }
        return contentLength;
    } catch (error) {
        console.error('Error occurred while sending HEAD request:', error.message);
    }
}

module.exports = async (ctx) => {
    let count = 0; // 当前页数
    let currentUrl = 'http://i.jandan.net/pic';
    const final = [];

    async function getOnePage(url) {
        const headers = {
            // 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            Referer: 'http://i.jandan.net/',
        };

        const response = await got({
            method: 'get',
            url,
            headers,
        });

        const $ = cheerio.load(response.data);

        if (count > ignore) {
            const items = await Promise.all(
                $('ol.commentlist li')
                    .not('.row')
                    .slice(0, ctx.query.limit ? parseInt(ctx.query.limit) : 50)
                    .toArray()
                    .map(async (item) => {
                        const $item = $(item);
                        let size = 0;
                        $item.find('.commenttext img, .tucao-report').remove();

                        const viewImgLinks = $item.find('.commenttext .view_img_link').toArray();
                        for (let i = 0; i < viewImgLinks.length; i++) {
                            const element = viewImgLinks[i];
                            const imgUrl = $(element).attr('href');
                            const proxyImgUrl = proxyPrefix + imgUrl;
                            $(element).replaceWith(`<img src="${proxyImgUrl}">`);
                            if (i === 0) {
                                size = await getImageSize(imgUrl);
                            }
                        }

                        const author = $item.find('b').first().text();
                        const description = $item.find('.commenttext');
                        const date = parseDate($item.find('.time').text());

                        const oo = +$item.find('.comment-like').next('span').text();
                        const xx = +$item.find('.comment-unlike').next('span').text();

                        const pubDate = timezone(date, 0);

                        const isOO = oo > ooCount && oo / (xx + oo) > ooRate;
                        const isSizeOk = size / (1024 * 1024) < sizeLimit;
                        const isAuthorOk = !authorBlackList.includes(author);
                        return {
                            author,
                            description: description.html(),
                            title: `${author}: ${description.text()}`,
                            pubDate,
                            link: `${rootUrl}/t/${$item.attr('id').split('-').pop()}`,
                            isShow: isOO && isSizeOk && isAuthorOk,
                        };
                    })
            );
            items.filter((item) => item.isShow).forEach((item) => final.push(item));
        }
        // console.log('##final.length', count, final.length);
        if (count < pages) {
            count++;
            currentUrl = `http:${$('.previous-comment-page').first().attr('href')}`;
            await sleep(50);
            await getOnePage(currentUrl);
        }
    }

    await getOnePage(currentUrl);
    // console.log('##final.length', final.length);
    ctx.state.data = {
        title: `煎蛋无聊图-srr`,
        link: `${rootUrl}/pic`,
        item: final,
    };
};
