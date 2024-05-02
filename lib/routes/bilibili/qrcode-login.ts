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
            const urlString = response.data.data.url;
            logger.info(`扫码成功，crossDomain URL: ${urlString}`);

            // B站扫码成功后 data.url 是跨域 URL，cookie 字段以 query param 形式携带
            // 例如：https://passport.bilibili.com/...?DedeUserID=xxx&SESSDATA=xxx%2Cxxx&bili_jct=xxx
            // 必须 decodeURIComponent，否则 SESSDATA 中的 %2C 等字符会让 cookie 无效
            let cookieStr = '';
            try {
                // 用 URL 对象解析，自动处理 query string
                const parsedUrl = new URL(urlString);
                const params = parsedUrl.searchParams;

                const dedeUserID    = params.get('DedeUserID');
                const dedeUserIDCk  = params.get('DedeUserID__ckMd5');
                const sessData      = params.get('SESSDATA');
                const biliJct       = params.get('bili_jct');
                const sid           = params.get('sid');

                logger.info(`解析到 cookie 字段: DedeUserID=${dedeUserID}, SESSDATA=${sessData ? '(有值)' : '无'}, bili_jct=${biliJct}`);

                if (dedeUserID && sessData && biliJct) {
                    const parts = [
                        `DedeUserID=${dedeUserID}`,
                        dedeUserIDCk ? `DedeUserID__ckMd5=${dedeUserIDCk}` : '',
                        `SESSDATA=${sessData}`,
                        `bili_jct=${biliJct}`,
                        sid ? `sid=${sid}` : '',
                    ].filter(Boolean);
                    cookieStr = parts.join('; ');
                    logger.info(`成功构建 cookie，长度: ${cookieStr.length}`);
                } else {
                    logger.warn(`缺少必要的 cookie 字段: DedeUserID=${dedeUserID}, SESSDATA=${sessData ? '有' : '无'}, bili_jct=${biliJct}`);
                }
            } catch (urlError) {
                logger.warn(`解析 crossDomain URL 失败: ${urlError}，尝试 fallback`);

                // Fallback：直接正则匹配并手动 decode
                const match = (key: string) => {
                    const m = urlString.match(new RegExp(`[?&]${key}=([^&]+)`));
                    return m ? decodeURIComponent(m[1]) : null;
                };
                const dedeUserID = match('DedeUserID');
                const dedeUserIDCk = match('DedeUserID__ckMd5');
                const sessData = match('SESSDATA');
                const biliJct = match('bili_jct');
                const sid = match('sid');

                if (dedeUserID && sessData && biliJct) {
                    cookieStr = [
                        `DedeUserID=${dedeUserID}`,
                        dedeUserIDCk ? `DedeUserID__ckMd5=${dedeUserIDCk}` : '',
                        `SESSDATA=${sessData}`,
                        `bili_jct=${biliJct}`,
                        sid ? `sid=${sid}` : '',
                    ].filter(Boolean).join('; ');
                    logger.info(`Fallback 构建 cookie 成功，长度: ${cookieStr.length}`);
                }
            }

            if (cookieStr && cookieStr.length > 10) {
                response.data.data.cookie = cookieStr;
            } else {
                logger.error(`无法提取有效的 cookie，登录失败。URL: ${urlString}`);
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
                let yamlConfig: { users: Array<{ uid: string; cookie: string; updated_at?: string }> } = { users: [] };
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
                        updated_at: new Date().toISOString(),
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
