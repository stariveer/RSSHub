import { Route } from '@/types';
import cache from '@/utils/cache';
import { config } from '@/config';
import utils from './utils';
import { parseDate } from '@/utils/parse-date';
import asyncPool from 'tiny-async-pool';
import ConfigNotFoundError from '@/errors/types/config-not-found';

export const route: Route = {
    path: '/subscriptions/:embed?',
    categories: ['social-media'],
    example: '/youtube/subscriptions',
    parameters: { embed: 'Default to embed the video, set to any value to disable embedding' },
    features: {
        requireConfig: [
            {
                name: 'YOUTUBE_KEY',
                description: '',
            },
            {
                name: 'YOUTUBE_CLIENT_ID',
                description: '',
            },
            {
                name: 'YOUTUBE_CLIENT_SECRET',
                description: '',
            },
            {
                name: 'YOUTUBE_REFRESH_TOKEN',
                description: '',
            },
        ],
    },
    radar: [
        {
            source: ['www.youtube.com/feed/subscriptions', 'www.youtube.com/feed/channels'],
            target: '/subscriptions',
        },
    ],
    name: 'Subscriptions',
    maintainers: ['TonyRL'],
    handler,
    url: 'www.youtube.com/feed/subscriptions',
};

async function handler(ctx) {
    if (!config.youtube || !config.youtube.key || !config.youtube.clientId || !config.youtube.clientSecret || !config.youtube.refreshToken) {
        throw new ConfigNotFoundError('YouTube RSS is disabled due to the lack of <a href="https://docs.rsshub.app/deploy/config#route-specific-configurations">relevant config</a>');
    }
    const embed = !ctx.req.param('embed');

    const channelIds = (await utils.getSubscriptions('snippet', cache)).data.items.map((item) => item.snippet.resourceId.channelId);

    const playlistIds = [];
    for await (const playlistId of asyncPool(30, channelIds, async (channelId) => (await utils.getChannelWithId(channelId, 'contentDetails', cache)).data.items[0].contentDetails.relatedPlaylists.uploads)) {
        playlistIds.push(playlistId);
    }

    let items = [];
    for await (const item of asyncPool(30, playlistIds, async (playlistId) => (await utils.getPlaylistItems(playlistId, 'snippet', cache))?.data.items)) {
        items.push(item);
    }

    // https://measurethat.net/Benchmarks/Show/7223
    // concat > reduce + concat >>> flat
    items = items.flat();

    items = items
        .filter((i) => i && !i.error && i.snippet.title !== 'Private video' && i.snippet.title !== 'Deleted video')
        .map((item) => {
            const snippet = item.snippet;
            const videoId = snippet.resourceId.videoId;
            const img = utils.getThumbnail(snippet.thumbnails);

            // 获取当前域名
            const isDev = process.env.NODE_ENV === 'dev';
            const domain = isDev ? 'http://localhost:1200' : 'https://rsshub.trainspott.in';

            // 创建三个按钮
            const buttonStyle = `font-size:40px; font-weight:bold; cursor:pointer; background-color:#4b9ae9; padding:40px 0; flex: 1; border: 1px solid #ccc; border-radius: 5px; text-align: center;`;
            const onclickLater = `fetch('${domain}/youtube/add-to-playlist/later/${videoId}')`;
            const onclickFavorite = `fetch('${domain}/youtube/add-to-playlist/favorite/${videoId}')`;
            const onclickCast = `fetch('${domain}/youtube/add-to-playlist/cast/${videoId}')`;
            const actionButtons = `<div style="display:flex; flex-direction: column;">
                <div style="display:flex;">
                    <button style="${buttonStyle}" onclick="${onclickLater}">听</button>
                    <button style="${buttonStyle}" onclick="${onclickFavorite}">看</button>
                    <button style="${buttonStyle}" onclick="${onclickCast}">投</button>
                </div>
                <div style="display:flex;">
                    <a style="${buttonStyle}" href="vnd.youtube://m.youtube.com/watch?v=${videoId}">打开客户端</a>
                </div>
            </div>`;

            return {
                title: snippet.title,
                description: `${actionButtons}${utils.renderDescription(embed, videoId, img, utils.formatDescription(snippet.description))}`,
                pubDate: parseDate(snippet.publishedAt),
                link: `https://www.youtube.com/watch?v=${videoId}`,
                author: snippet.videoOwnerChannelTitle,
                image: img.url,
            };
        });

    const ret = {
        title: 'Subscriptions - YouTube',
        description: 'YouTube Subscriptions',
        item: items,
    };

    ctx.set('json', {
        ...ret,
        channelIds,
        playlistIds,
    });
    return ret;
}
