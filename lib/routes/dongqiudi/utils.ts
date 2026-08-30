import { config } from '@/config';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { load } from 'cheerio';

const ProcessVideo = (content) => {
    content('div.video').each((i, v) => {
        let link = new URL(v.attribs.src);
        if (link.host === 'm.miguvideo.com') {
            content(`<a href="${link.href}"> ▶️ 观看视频 </a><br>`).insertAfter(v);
            content(v).remove();
        } else {
            link = v.attribs.src;
            switch (v.attribs.site) {
                case 'qiniu':
                    content(`<video width="100%" controls="controls"> <source src="${link}" type="video/mp4"> Your RSS reader does not support video playback. </video>`).insertAfter(v);
                    content(v).remove();
                    break;
                case 'youku':
                    content(`<iframe height='100%' width='100%' src='${link}' frameborder=0 scrolling=no webkitallowfullscreen=true allowfullscreen=true></iframe>`).insertAfter(v);
                    content(v).remove();
                    break;
                default:
                    break;
            }
        }
    });

    // Process iframes
    content('iframe.media-iframe, .edui-faked-video').each((i, v) => {
        const link = v.attribs.src;
        if (link.startsWith('http://ssports.iqiyi.com/')) {
            content(`<a href="${link.link}"> ▶️ 观看视频 </a><br>`).insertAfter(v);
        }

        content(v).remove();
    });

    return content;
};

const ProcessHref = (content) => {
    content.each((j, y) => {
        if (y.attribs.href) {
            y.attribs.href = y.attribs.href.replace('dongqiudi:///news', 'https://www.dongqiudi.com/article');
        }
    });
};

const ProcessImg = (content) => {
    content.each((_, img) => {
        if (img.attribs['data-gif-src'] && img.attribs['data-gif-src'].length) {
            img.attribs = { src: img.attribs['data-gif-src'] };
        }
        if (img.attribs['orig-src'] && img.attribs['orig-src'].length) {
            img.attribs.src = img.attribs['orig-src'];
            delete img.attribs['orig-src'];
            delete img.attribs['data-src'];
        }
        img.attribs.src = img.attribs.src.includes('?watermark') ? img.attribs.src.split('?watermark')[0] : img.attribs.src;
    });
};

const ProcessFeed = async (ctx, type, id) => {
    const link = `https://www.dongqiudi.com/${type}/${id}`;
    const apiUrl = 'https://api.dongqiudi.com/v3/archive/app/channel/feeds';

    const metadataUrl = type === 'team' ? `https://www.dongqiudi.com/sport-data/soccer/biz/dqd/team/sample/${id}?app=dqd&lang=zh-cn` : `https://www.dongqiudi.com/sport-data/soccer/biz/dqd/v1/person/sample/${id}?app=dqd&lang=zh-cn`;

    const { data: metadataResponse } = await got(metadataUrl, {
        headers: {
            'user-agent': config.trueUA,
        },
    });

    const typeInfo =
        type === 'team'
            ? {
                  name: metadataResponse.team_name,
                  logo: metadataResponse.team_logo,
              }
            : {
                  name: metadataResponse.person_name,
                  logo: metadataResponse.person_logo,
              };
    const name = typeInfo.name;

    const { data } = await got(apiUrl, {
        searchParams: {
            id,
            type,
            size: 20,
            platform: 'web',
            version: '',
        },
    });

    const list = data.data.articles.map((article) => ({
        title: article.title,
        link: `https://www.dongqiudi.com/article/${article.id}.html`,
        category: [article.category, ...(article.secondary_category ?? [])],
        pubDate: parseDate(article.show_time),
    }));

    const out = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const id = item.link.match(/articles?\/(\d+)\.html/)[1];
                await ProcessFeedType2(item, id);

                return item;
            })
        )
    );

    return {
        title: `${name} - 相关新闻`,
        link,
        image: typeInfo.logo,
        item: out,
    };
};

const ProcessFeedType2 = async (item, id) => {
    const url = `https://www.dongqiudi.com/api/v2/article/detail/${id}`;
    const { data: response } = await got(url, {
        headers: {
            'user-agent': config.trueUA,
        },
    });

    const data = response.data;

    if (data && Object.keys(data).length > 0) {
        const body = ProcessVideo(load(data.body, null, false));
        ProcessHref(body('a'));
        ProcessImg(body('img'));
        item.description = body.html();
        item.author = data.writer;
        item.pubDate = parseDate(data.show_time, 'X');
    }
};

const ProcessFeedType3 = (item, response) => {
    const $ = load(response);
    const initialState = JSON.parse(
        $('script:contains("window.__INITIAL_STATE__")')
            .text()
            .match(/window\.__INITIAL_STATE__\s*=\s*(.*?);\(/)[1]
    );

    // filter out undefined item
    if (!initialState) {
        return;
    }

    if (Object.keys(initialState.articleContent).length) {
        const data = Object.values(initialState.articleContent)[0];
        const body = ProcessVideo(load(data.body, null, false));
        ProcessHref(body('a'));
        ProcessImg(body('img'));
        item.description = body.html();
        item.author = data.writer;
    }
};

export default { ProcessVideo, ProcessFeed, ProcessFeedType2, ProcessFeedType3, ProcessHref, ProcessImg };
