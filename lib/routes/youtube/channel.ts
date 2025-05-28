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

// 添加YouTube播放列表路由
export const addToPlaylistRoute: Route = {
    path: '/add-to-playlist/:type/:videoId',
    categories: ['social-media'],
    example: '/youtube/add-to-playlist/later/dQw4w9WgXcQ',
    parameters: { type: '播放列表类型: later(稍后听), favorite(默认收藏), cast(投屏看)', videoId: 'YouTube视频ID' },
    features: {
        requireConfig: [
            {
                name: 'YOUTUBE_CLIENT_ID',
                description: 'YouTube OAuth客户端ID',
            },
            {
                name: 'YOUTUBE_CLIENT_SECRET',
                description: 'YouTube OAuth客户端密钥',
            },
            {
                name: 'YOUTUBE_REFRESH_TOKEN',
                description: 'YouTube OAuth刷新令牌',
            },
            {
                name: 'YOUTUBE_PLAYLIST_ID_ADD_LATER',
                description: '稍后听播放列表ID',
            },
            {
                name: 'YOUTUBE_PLAYLIST_ID_DEFAULT_FAVORITE',
                description: '默认收藏播放列表ID',
            },
            {
                name: 'YOUTUBE_PLAYLIST_ID_SCREEN_CAST',
                description: '投屏看播放列表ID',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '添加到播放列表',
    maintainers: ['DIYgod'],
    handler: addToPlaylistHandler,
};

async function addToPlaylistHandler(ctx) {
    const type = ctx.req.param('type');
    const videoId = ctx.req.param('videoId');

    if (!config.youtube || !config.youtube.clientId || !config.youtube.clientSecret || !config.youtube.refreshToken) {
        throw new ConfigNotFoundError('YouTube OAuth配置缺失');
    }

    let playlistId;
    let playlistName;

    if (type === 'later') {
        playlistId = process.env.YOUTUBE_PLAYLIST_ID_ADD_LATER;
        playlistName = '稍后听';
    } else if (type === 'favorite') {
        playlistId = process.env.YOUTUBE_PLAYLIST_ID_DEFAULT_FAVORITE;
        playlistName = '默认收藏';
    } else if (type === 'cast') {
        playlistId = process.env.YOUTUBE_PLAYLIST_ID_SCREEN_CAST;
        playlistName = '投屏看';
    } else {
        throw new InvalidParameterError('无效的播放列表类型');
    }

    if (!playlistId) {
        throw new ConfigNotFoundError(`${playlistName}播放列表ID未配置`);
    }

    const result = await utils.addVideoToPlaylist(playlistId, videoId, cache);

    return {
        title: `添加视频到${playlistName}`,
        description: result.success ? `成功添加视频 ${videoId} 到${playlistName}播放列表` : `添加失败: ${result.message}`,
        item: [
            {
                title: result.success ? `成功添加到${playlistName}` : '添加失败',
                description: result.success ? `成功添加视频 ${videoId} 到${playlistName}播放列表` : `添加失败: ${result.message}`,
                pubDate: new Date().toUTCString(),
                link: `https://www.youtube.com/watch?v=${videoId}`,
            },
        ],
    };
}

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
    const isDev = process.env.NODE_ENV === 'dev';
    const domain = isDev ? 'http://localhost:1200' : 'https://rsshub.trainspott.in';

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
                const onclickLater = `fetch('${domain}/youtube/add-to-playlist/later/${videoId}')`;
                const onclickFavorite = `fetch('${domain}/youtube/add-to-playlist/favorite/${videoId}')`;
                const onclickCast = `fetch('${domain}/youtube/add-to-playlist/cast/${videoId}')`;

                const actionButtons = `<div style="display:flex; flex-direction: column;">
                    <div style="display:flex;">
                        <button style="${buttonStyle}" onclick="${onclickLater}">稍后听</button>
                        <button style="${buttonStyle}" onclick="${onclickFavorite}">默认收藏</button>
                        <button style="${buttonStyle}" onclick="${onclickCast}">投屏看</button>
                    </div>
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
