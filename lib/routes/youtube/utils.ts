import { getCurrentPath } from '@/utils/helpers';
const __dirname = getCurrentPath(import.meta.url);

import { google } from 'googleapis';
const { OAuth2 } = google.auth;
import { art } from '@/utils/render';
import path from 'node:path';
import { config } from '@/config';
import got from '@/utils/got';

let count = 0;
const youtube = {};
if (config.youtube && config.youtube.key) {
    const keys = config.youtube.key.split(',');

    for (const [index, key] of keys.entries()) {
        if (key) {
            youtube[index] = google.youtube({
                version: 'v3',
                auth: key,
            });
            count = index + 1;
        }
    }
}

let index = -1;
const exec = async (func) => {
    let result;
    for (let i = 0; i < count; i++) {
        index++;
        try {
            // eslint-disable-next-line no-await-in-loop
            result = await func(youtube[index % count]);
            break;
        } catch {
            // console.error(error);
        }
    }
    return result;
};

let youtubeOAuth2Client;
if (config.youtube && config.youtube.clientId && config.youtube.clientSecret && config.youtube.refreshToken) {
    youtubeOAuth2Client = new OAuth2(config.youtube.clientId, config.youtube.clientSecret, 'https://developers.google.com/oauthplayground');
    youtubeOAuth2Client.setCredentials({ refresh_token: config.youtube.refreshToken });
}

export const getPlaylistItems = (id, part, cache) =>
    cache.tryGet(
        `youtube:getPlaylistItems:${id}`,
        async () => {
            const res = await exec((youtube) =>
                youtube.playlistItems.list({
                    part,
                    playlistId: id,
                    maxResults: 50, // youtube api param value default is 5
                })
            );
            return res;
        },
        config.cache.routeExpire,
        false
    );
export const getPlaylist = (id, part, cache) =>
    cache.tryGet(`youtube:getPlaylist:${id}`, async () => {
        const res = await exec((youtube) =>
            youtube.playlists.list({
                part,
                id,
            })
        );
        return res;
    });
export const getChannelWithId = (id, part, cache) =>
    cache.tryGet(`youtube:getChannelWithId:${id}`, async () => {
        const res = await exec((youtube) =>
            youtube.channels.list({
                part,
                id,
            })
        );
        return res;
    });
export const getChannelWithUsername = (username, part, cache) =>
    cache.tryGet(`youtube:getChannelWithUsername:${username}`, async () => {
        const res = await exec((youtube) =>
            youtube.channels.list({
                part,
                forUsername: username,
            })
        );
        return res;
    });
// not in use
// export const getVideoAuthor = async (id, part) => {
//     const res = await exec((youtube) =>
//         youtube.videos.list({
//             part,
//             id,
//         })
//     );
//     return res;
// }
export const getThumbnail = (thumbnails) => thumbnails.maxres || thumbnails.standard || thumbnails.high || thumbnails.medium || thumbnails.default;
export const formatDescription = (description) => description.replaceAll(/\r\n|\r|\n/g, '<br>');
export const renderDescription = (embed, videoId, img, description) =>
    art(path.join(__dirname, 'templates/description.art'), {
        embed,
        videoId,
        img,
        description,
    });

export const getSubscriptions = async (part, cache) => {
    // access tokens expire after one hour
    let accessToken = await cache.get('youtube:accessToken', false);
    if (!accessToken) {
        const data = await youtubeOAuth2Client.getAccessToken();
        accessToken = data.token;
        await cache.set('youtube:accessToken', accessToken, 3600); // ~3600s
    }
    youtubeOAuth2Client.setCredentials({ access_token: accessToken, refresh_token: config.youtube.refreshToken });

    return cache.tryGet('youtube:getSubscriptions', () => getSubscriptionsRecusive(part), config.cache.routeExpire, false);
};
export async function getSubscriptionsRecusive(part, nextPageToken?) {
    const res = await google.youtube('v3').subscriptions.list({
        auth: youtubeOAuth2Client,
        part,
        mine: true,
        maxResults: 50,
        pageToken: nextPageToken ?? undefined,
    });
    // recursively get next page
    if (res.data.nextPageToken) {
        const next = await getSubscriptionsRecusive(part, res.data.nextPageToken);
        res.data.items = [...res.data.items, ...next.data.items];
    }
    return res;
}
// taken from https://webapps.stackexchange.com/a/101153
export const isYouTubeChannelId = (id) => /^UC[\w-]{21}[AQgw]$/.test(id);
export const getLive = (id, cache) =>
    cache.tryGet(`youtube:getLive:${id}`, async () => {
        const res = await exec((youtube) =>
            youtube.search.list({
                part: 'snippet',
                channelId: id,
                eventType: 'live',
                type: 'video',
            })
        );
        return res;
    });

export const getAccessToken = async (cache) => {
    // 检查是否有缓存的access_token
    let accessToken = await cache.get('youtube:accessToken', false);
    if (!accessToken) {
        if (!config.youtube || !config.youtube.clientId || !config.youtube.clientSecret || !config.youtube.refreshToken) {
            return null;
        }
        try {
            const response = await got.post('https://oauth2.googleapis.com/token', {
                form: {
                    client_id: config.youtube.clientId,
                    client_secret: config.youtube.clientSecret,
                    refresh_token: config.youtube.refreshToken,
                    grant_type: 'refresh_token',
                },
            });
            accessToken = response.data.access_token;
            await cache.set('youtube:accessToken', accessToken, 3500); // 约1小时
        } catch (error) {
            console.error('Failed to refresh YouTube access token:', error);
            return null;
        }
    }
    return accessToken;
};

export const addVideoToPlaylist = async (playlistId, videoId, cache) => {
    const accessToken = await getAccessToken(cache);
    if (!accessToken) {
        return { success: false, message: 'Failed to get access token' };
    }

    try {
        await got.post('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            json: {
                snippet: {
                    playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId,
                    },
                },
            },
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to add video to playlist:', error);
        return { success: false, message: error.message };
    }
};

const youtubeUtils = {
    getPlaylistItems,
    getPlaylist,
    getChannelWithId,
    getChannelWithUsername,
    getThumbnail,
    formatDescription,
    renderDescription,
    getSubscriptions,
    getSubscriptionsRecusive,
    isYouTubeChannelId,
    getLive,
    getAccessToken,
    addVideoToPlaylist,
};
export default youtubeUtils;
