import { Route } from '@/types';
import cache from '@/utils/cache';
import utils from './utils';
import { config } from '@/config';
import { parseDate } from '@/utils/parse-date';
import ConfigNotFoundError from '@/errors/types/config-not-found';
import InvalidParameterError from '@/errors/types/invalid-parameter';

export const route: Route = {
    path: '/channel/:id/:embed?',
    categories: ['social-media'],
    example: '/youtube/channel/UCDwDMPOZfxVV0x_dz0eQ8KQ',
    parameters: { id: 'YouTube channel id', embed: 'Default to embed the video, set to any value to disable embedding' },
    features: {
        requireConfig: [
            {
                name: 'YOUTUBE_KEY',
                description: ' YouTube API Key, support multiple keys, split them with `,`, [API Key application](https://console.developers.google.com/)',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.youtube.com/channel/:id'],
            target: '/channel/:id',
        },
    ],
    name: 'Channel with id',
    maintainers: ['DIYgod'],
    handler,
    description: `:::tip
YouTube provides official RSS feeds for channels, for instance [https://www.youtube.com/feeds/videos.xml?channel\_id=UCDwDMPOZfxVV0x\_dz0eQ8KQ](https://www.youtube.com/feeds/videos.xml?channel_id=UCDwDMPOZfxVV0x_dz0eQ8KQ).
:::`,
};

async function handler(ctx) {
    if (!config.youtube || !config.youtube.key) {
        throw new ConfigNotFoundError('YouTube RSS is disabled due to the lack of <a href="https://docs.rsshub.app/deploy/config#route-specific-configurations">relevant config</a>');
    }
    const id = ctx.req.param('id');
    const embed = !ctx.req.param('embed');

    if (!utils.isYouTubeChannelId(id)) {
        throw new InvalidParameterError(`Invalid YouTube channel ID. \nYou may want to use <code>/youtube/user/:id</code> instead.`);
    }

    const playlistId = (await utils.getChannelWithId(id, 'contentDetails', cache)).data.items[0].contentDetails.relatedPlaylists.uploads;

    const data = (await utils.getPlaylistItems(playlistId, 'snippet', cache)).data.items;

    // 获取当前域名
    // const isDev = process.env.NODE_ENV === 'dev';
    // const domain = isDev ? 'http://localhost:1200' : 'https://rsshub.trainspott.in';

    return {
        title: `${data[0].snippet.channelTitle} - YouTube`,
        link: `https://www.youtube.com/channel/${id}`,
        description: `YouTube channel ${data[0].snippet.channelTitle}`,
        item: data
            .filter((d) => d.snippet.title !== 'Private video' && d.snippet.title !== 'Deleted video')
            .map((item) => {
                const snippet = item.snippet;
                const videoId = snippet.resourceId.videoId;

                // 创建三个按钮
                const buttonStyle = `font-size:40px; font-weight:bold; cursor:pointer; background-color:#4b9ae9; padding:40px 0; flex: 1; border: 1px solid #ccc; border-radius: 5px; text-align: center;`;
                // const onclickLater = `fetch('${domain}/youtube/add-to-playlist/later/${videoId}')`;
                // const onclickFavorite = `fetch('${domain}/youtube/add-to-playlist/favorite/${videoId}')`;
                // const onclickCast = `fetch('${domain}/youtube/add-to-playlist/cast/${videoId}')`;
                // <div style="display:flex;">
                //     <button style="${buttonStyle}" onclick="${onclickLater}">稍后听</button>
                //     <button style="${buttonStyle}" onclick="${onclickFavorite}">默认收藏</button>
                //     <button style="${buttonStyle}" onclick="${onclickCast}">投屏看</button>
                // </div>
                const actionButtons = `<div style="display:flex; flex-direction: column;">
                    <div style="display:flex;">
                        <a style="${buttonStyle}" href="vnd.youtube://m.youtube.com/watch?v=${videoId}">打开客户端</a>
                    </div>
                </div>`;

                const img = utils.getThumbnail(snippet.thumbnails);
                return {
                    title: snippet.title,
                    description: `${actionButtons}${utils.renderDescription(embed, videoId, img, utils.formatDescription(snippet.description))}`,
                    pubDate: parseDate(snippet.publishedAt),
                    link: `https://www.youtube.com/watch?v=${videoId}`,
                    author: snippet.videoOwnerChannelTitle,
                    image: img.url,
                };
            }),
    };
}
