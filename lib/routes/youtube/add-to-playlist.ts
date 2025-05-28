import { Route } from '@/types';
import cache from '@/utils/cache';
import utils from './utils';
import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';
import InvalidParameterError from '@/errors/types/invalid-parameter';

export const route: Route = {
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
    handler,
};

async function handler(ctx) {
    const type = ctx.req.param('type');
    const videoId = ctx.req.param('videoId');

    if (!config.youtube || !config.youtube.clientId || !config.youtube.clientSecret || !config.youtube.refreshToken) {
        throw new ConfigNotFoundError('YouTube OAuth配置缺失');
    }

    let playlistId;
    let playlistName;

    switch (type) {
    case 'later':
        playlistId = process.env.YOUTUBE_PLAYLIST_ID_ADD_LATER;
        playlistName = '稍后听';

    break;

    case 'favorite':
        playlistId = process.env.YOUTUBE_PLAYLIST_ID_DEFAULT_FAVORITE;
        playlistName = '默认收藏';

    break;

    case 'cast':
        playlistId = process.env.YOUTUBE_PLAYLIST_ID_SCREEN_CAST;
        playlistName = '投屏看';

    break;

    default:
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
