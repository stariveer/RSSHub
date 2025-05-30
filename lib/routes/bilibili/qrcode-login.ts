import got from '@/utils/got';
import logger from '@/utils/logger';
import QRCode from 'qrcode';
import { updateUserCookie } from './yaml-config';

// 获取二维码Key
export async function generateQrCodeKey() {
    try {
        const response = await got({
            method: 'get',
            url: 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
            headers: {
                Referer: 'https://passport.bilibili.com/login',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (response.data.code === 0 && response.data.data) {
            logger.debug(`成功获取B站二维码Key: ${response.data.data.qrcode_key}`);
            return {
                qrcode_key: response.data.data.qrcode_key,
                url: response.data.data.url,
            };
        } else {
            logger.error('获取B站二维码Key失败:', response.data);
            throw new Error(`获取B站二维码Key失败: ${response.data.message || '未知错误'}`);
        }
    } catch (error) {
        logger.error('获取B站二维码Key发生错误:', error);
        throw error;
    }
}

// 生成二维码图片的base64字符串
export async function generateQrCodeImage(url) {
    try {
        const base64Image = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 200,
        });
        logger.debug('成功生成二维码图片');
        return base64Image;
    } catch (error) {
        logger.error('生成二维码图片失败:', error);
        throw error;
    }
}

// 轮询二维码扫描状态
export async function pollQrCodeStatus(qrcode_key) {
    try {
        logger.debug(`轮询二维码状态: ${qrcode_key}`);
        const response = await got({
            method: 'get',
            url: 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll',
            headers: {
                Referer: 'https://passport.bilibili.com/login',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            searchParams: {
                qrcode_key,
            },
        });

        // 记录完整的响应数据
        logger.info(`二维码轮询原始结果: ${JSON.stringify(response.data)}`);

        // 检查是否是扫码成功的情况
        if (response.data.code === 0 && response.data.data && response.data.data.code === 0 && response.data.data.url) {
            // 检查是否有直接的cookie字段
            if (response.data.data.cookie) {
                logger.info(`从响应中直接获取到cookie，长度: ${response.data.data.cookie.length}`);
            } else {
                logger.info(`响应中没有直接的cookie字段，尝试从URL中提取`);
            }

            // 尝试从URL中提取cookie
            const urlString = response.data.data.url;
            logger.info(`登录成功URL: ${urlString}`);

            // 从URL中提取cookie
            let extractedCookie = '';
            if (urlString && urlString.includes('&cookies=')) {
                const cookieStart = urlString.indexOf('&cookies=') + 9;
                const cookieEnd = urlString.indexOf('&', cookieStart);
                extractedCookie = cookieEnd > cookieStart ?
                    decodeURIComponent(urlString.substring(cookieStart, cookieEnd)) :
                    decodeURIComponent(urlString.substring(cookieStart));

                logger.info(`从URL中提取的cookie长度: ${extractedCookie.length}`);

                // 检查提取的cookie是否有效
                if (extractedCookie && extractedCookie.length > 10) {
                    logger.info(`从URL提取的cookie有效，使用该cookie`);
                    response.data.data.cookie = extractedCookie;
                } else {
                    logger.warn(`从URL提取的cookie无效: ${extractedCookie}`);
                }
            } else {
                logger.warn(`URL中没有cookies参数: ${urlString}`);
            }

            // 如果没有cookie，尝试从响应头中获取
            if (!response.data.data.cookie || response.data.data.cookie.length < 10) {
                logger.info(`尝试从响应头中获取cookie`);
                try {
                    const headerCookies = response.headers && response.headers['set-cookie'];
                    if (headerCookies && headerCookies.length) {
                        const cookieStr = headerCookies.join('; ');
                        logger.info(`从响应头中获取到cookie，长度: ${cookieStr.length}`);
                        response.data.data.cookie = cookieStr;
                    } else {
                        logger.warn('响应头中没有cookie');
                    }
                } catch (headerError) {
                    logger.warn(`从响应头获取cookie失败: ${headerError}`);
                }
            }

            // 最后检查是否有有效的cookie
            if (!response.data.data.cookie || response.data.data.cookie.length < 10) {
                logger.info('无法获取有效的cookie，尝试手动构建');

                // 尝试从URL中提取必要参数构建cookie
                if (urlString) {
                    try {
                        const dedeUserIDMatch = urlString.match(/DedeUserID=(\d+)/);
                        const dedeUserIDCkMatch = urlString.match(/DedeUserID__ckMd5=([^&]+)/);
                        const sessDataMatch = urlString.match(/SESSDATA=([^&]+)/);
                        const biliJctMatch = urlString.match(/bili_jct=([^&]+)/);

                        if (dedeUserIDMatch && sessDataMatch && biliJctMatch) {
                            const manualCookie = [
                                `DedeUserID=${dedeUserIDMatch[1]}`,
                                dedeUserIDCkMatch ? `DedeUserID__ckMd5=${dedeUserIDCkMatch[1]}` : '',
                                `SESSDATA=${sessDataMatch[1]}`,
                                `bili_jct=${biliJctMatch[1]}`
                            ].filter(Boolean).join('; ');

                            logger.info(`手动构建的cookie: ${manualCookie}`);
                            response.data.data.cookie = manualCookie;
                        } else {
                            logger.warn('无法从URL中提取足够的参数构建cookie');
                        }
                    } catch (extractError) {
                        logger.warn(`从URL提取参数构建cookie失败: ${extractError}`);
                    }
                }
            }
        }

        return response.data;
    } catch (error) {
        logger.error('轮询二维码状态失败:', error);
        throw error;
    }
}

// 验证用户UID
export function verifyUserUid(cookie, expectedUid) {
    if (!cookie || typeof cookie !== 'string') {
        logger.warn(`无效的cookie: ${cookie}`);
        return false;
    }

    // 从Cookie中提取DedeUserID值
    const match = cookie.match(/DedeUserID=(\d+)/);
    if (match && match[1]) {
        const uid = match[1];
        const isMatch = uid === expectedUid;
        logger.debug(`验证用户UID: 期望=${expectedUid}, 实际=${uid}, 匹配=${isMatch}`);
        return isMatch;
    }

    // 如果没有找到UID，直接返回true以允许登录
    // 这是因为有些情况下cookie格式可能不包含明确的UID
    logger.warn(`无法从Cookie中提取UID，允许登录: ${cookie.substring(0, 50)}...`);
    return true;
}

// 保存Cookie到YAML文件
export async function saveCookie(uid, cookie) {
    try {
        logger.info(`准备保存Cookie到YAML文件, uid=${uid}, cookie长度=${cookie ? cookie.length : 0}`);

        if (!cookie || cookie.length < 10) {
            logger.error(`无效的cookie数据，无法保存: ${cookie}`);
            return false;
        }

        // 尝试使用updateUserCookie函数更新
        const result = await updateUserCookie(uid, cookie);

        // 如果更新失败，尝试直接写入文件
        if (!result) {
            logger.warn(`通过updateUserCookie更新失败，尝试直接写入文件`);

            try {
                const fs = require('fs');
                const path = require('path');
                const yaml = require('js-yaml');

                const YAML_CONFIG_PATH = path.join(process.cwd(), 'bilibili-cookies.yml');

                // 读取现有YAML文件
                let yamlConfig: { users: Array<{uid: string, cookie: string, updated_at?: string}> } = { users: [] };
                if (fs.existsSync(YAML_CONFIG_PATH)) {
                    const fileContent = fs.readFileSync(YAML_CONFIG_PATH, 'utf8');
                    const loadedConfig = yaml.load(fileContent);
                    yamlConfig = loadedConfig || { users: [] };
                }

                // 确保users数组存在
                if (!yamlConfig.users) {
                    yamlConfig.users = [];
                }

                // 查找是否已存在该用户
                const userIndex = yamlConfig.users.findIndex((u) => u.uid === uid);

                if (userIndex >= 0) {
                    // 更新现有用户
                    yamlConfig.users[userIndex].cookie = cookie;
                    yamlConfig.users[userIndex].updated_at = new Date().toISOString();
                } else {
                    // 添加新用户
                    yamlConfig.users.push({
                        uid,
                        cookie,
                        updated_at: new Date().toISOString()
                    });
                }

                // 写入文件
                const yamlContent = yaml.dump(yamlConfig);
                fs.writeFileSync(YAML_CONFIG_PATH, yamlContent, 'utf8');
                logger.info(`成功直接写入cookie到YAML文件`);

                return true;
            } catch (fsError) {
                logger.error(`直接写入cookie到YAML文件失败: ${fsError}`);
                return false;
            }
        }

        if (result) {
            logger.info(`成功保存Cookie到YAML文件, uid=${uid}`);
        } else {
            logger.error(`保存Cookie到YAML文件失败, uid=${uid}`);
        }
        return result;
    } catch (error) {
        logger.error('保存Cookie到YAML文件失败:', error);
        return false;
    }
}
