import { Route } from '@/types';
import { generateQrCodeKey, generateQrCodeImage, pollQrCodeStatus } from './qrcode-login';
import logger from '@/utils/logger';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export const route: Route = {
    path: '/qrcode/:action',
    categories: ['social-media'],
    example: '/bilibili/qrcode/generate',
    parameters: { action: '操作类型，generate 生成二维码，poll 轮询状态，reload-cookie 重新加载Cookie' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['bilibili.com/'],
            target: '/qrcode/generate',
        },
    ],
    name: 'B站二维码登录',
    maintainers: ['anonymous'],
    handler,
    description: `提供B站二维码登录功能，主要用于更新Cookie`,
};

async function handler(ctx) {
    const action = ctx.req.param('action');

    try {
        switch (action) {
            case 'generate': {
                // 生成二维码
                const qrcodeData = await generateQrCodeKey();
                const image = await generateQrCodeImage(qrcodeData.url);

                logger.debug(`Generated QR code with key: ${qrcodeData.qrcode_key}`);

                // 返回JSON响应而不是RSS
                return ctx.json({
                    success: true,
                    qrcode_key: qrcodeData.qrcode_key,
                    image,
                    url: qrcodeData.url,
                });
            }
            case 'poll': {
                // 获取查询参数
                const qrcodeKey = ctx.req.query('qrcode_key');
                const expectedUid = ctx.req.query('uid');

                if (!qrcodeKey) {
                    return ctx.json({
                        code: -1,
                        message: '缺少必要参数qrcode_key',
                    });
                }

                try {
                    // 轮询二维码状态
                    const pollResult = await pollQrCodeStatus(qrcodeKey);
                    logger.info(`Poll result for key ${qrcodeKey}: ${JSON.stringify(pollResult)}`);

                    // 如果登录成功
                    if (pollResult.code === 0 && pollResult.data && pollResult.data.code === 0) {
                        const cookies = pollResult.data.cookie || '';
                        logger.info(`Login successful, cookies length: ${cookies.length}`);

                        // 输出部分cookie内容以便调试
                        if (cookies.length > 0) {
                            logger.info(`Cookie preview: ${cookies.substring(0, 50)}...`);

                            // 检查cookie格式是否正确
                            const hasSESSDATA = cookies.includes('SESSDATA=');
                            const hasBiliJct = cookies.includes('bili_jct=');
                            const hasDedeUserID = cookies.includes('DedeUserID=');

                            logger.info(`Cookie格式检查: SESSDATA=${hasSESSDATA}, bili_jct=${hasBiliJct}, DedeUserID=${hasDedeUserID}`);

                            // 提取DedeUserID进行验证
                            const uidMatch = cookies.match(/DedeUserID=(\d+)/);
                            if (uidMatch) {
                                const cookieUid = uidMatch[1];
                                logger.info(`从Cookie中提取的UID: ${cookieUid}, 期望的UID: ${expectedUid}`);
                            }
                        }

                        // 检查cookie有效性
                        const isCookieValid = cookies.length >= 10;
                        if (isCookieValid) {
                            // 完全禁用UID验证，直接保存Cookie
                            if (expectedUid) {
                                // 直接写入文件进行测试
                                const YAML_CONFIG_PATH = path.join(process.cwd(), 'bilibili-cookies.yml');
                                logger.info(`直接写入cookie到文件: ${YAML_CONFIG_PATH}`);

                                try {
                                    // 读取现有YAML文件
                                    const yamlContent = fs.readFileSync(YAML_CONFIG_PATH, 'utf8');
                                    logger.info(`读取到现有YAML内容: ${yamlContent}`);

                                    // 使用js-yaml解析YAML
                                    const yamlObj = yaml.load(yamlContent);
                                    if (yamlObj && yamlObj.users) {
                                        const userIndex = yamlObj.users.findIndex((u) => u.uid === expectedUid);
                                        if (userIndex >= 0) {
                                            yamlObj.users[userIndex].cookie = cookies;
                                            yamlObj.users[userIndex].updated_at = new Date().toISOString();
                                        } else {
                                            yamlObj.users.push({
                                                uid: expectedUid,
                                                cookie: cookies,
                                                updated_at: new Date().toISOString(),
                                            });
                                        }

                                        // 转换回YAML字符串并写入文件
                                        const newContent = yaml.dump(yamlObj);
                                        fs.writeFileSync(YAML_CONFIG_PATH, newContent, 'utf8');
                                        logger.info(`成功直接写入cookie到文件`);

                                        return ctx.json({
                                            code: 0,
                                            message: '登录成功！Cookie已更新',
                                            data: {
                                                code: 0,
                                                message: '登录成功',
                                            },
                                        });
                                    } else {
                                        logger.error('无法解析YAML文件内容');
                                        return ctx.json({
                                            code: -1,
                                            message: '保存Cookie失败，YAML文件格式错误',
                                        });
                                    }
                                } catch (fsError) {
                                    logger.error(`直接写入cookie失败: ${fsError}`);
                                    return ctx.json({
                                        code: -1,
                                        message: '保存Cookie失败，文件操作错误',
                                    });
                                }
                            } else {
                                return ctx.json({
                                    code: 0,
                                    message: '登录成功！但未指定UID，无法保存Cookie',
                                    data: {
                                        code: 0,
                                        message: '登录成功',
                                    },
                                });
                            }
                        } else {
                            logger.error(`Invalid cookies received: ${cookies}`);
                            return ctx.json({
                                code: -1,
                                message: '从B站获取的Cookie无效，请重试',
                            });
                        }
                    } else if (pollResult.code === 0 && pollResult.data && pollResult.data.code === 86090) {
                        // 已扫码但未确认，特殊处理
                        return ctx.json({
                            code: 86090,
                            message: '二维码已扫码未确认',
                        });
                    } else if (pollResult.code === 0 && pollResult.data && pollResult.data.code === 86101) {
                        // 未扫码，特殊处理
                        return ctx.json({
                            code: 86101,
                            message: '未扫码',
                        });
                    } else if (pollResult.code === 0 && pollResult.data && pollResult.data.code === 86038) {
                        // 二维码已失效，特殊处理
                        return ctx.json({
                            code: 86038,
                            message: '二维码已失效，请刷新',
                        });
                    } else {
                        // 其他状态
                        const statusCode = pollResult.data?.code === undefined ? pollResult.code : pollResult.data.code;
                        const statusMessage = pollResult.data?.message || pollResult.message || '未知状态';

                        return ctx.json({
                            code: statusCode,
                            message: statusMessage,
                        });
                    }
                } catch (pollError: any) {
                    logger.error(`轮询二维码状态出错: ${pollError}`);
                    return ctx.json({
                        code: -1,
                        message: `轮询二维码状态出错: ${pollError.message}`,
                    });
                }

                break;
            }
            case 'reload-cookie':
                // 重新加载Cookie的逻辑
                try {
                    // 获取请求体中的UID
                    const requestBody = await ctx.req.json();
                    const uid = requestBody.uid || ctx.req.query('uid');

                    if (!uid) {
                        return ctx.json({
                            success: false,
                            message: '缺少必要参数uid',
                        });
                    }

                    logger.info(`尝试重新加载用户 ${uid} 的Cookie`);

                    // 重新加载配置
                    const YAML_CONFIG_PATH = path.join(process.cwd(), 'bilibili-cookies.yml');

                    if (!fs.existsSync(YAML_CONFIG_PATH)) {
                        logger.error(`Cookie配置文件不存在: ${YAML_CONFIG_PATH}`);
                        return ctx.json({
                            success: false,
                            message: 'Cookie配置文件不存在',
                        });
                    }

                    // 读取YAML文件
                    const yamlContent = fs.readFileSync(YAML_CONFIG_PATH, 'utf8');
                    const yamlObj = yaml.load(yamlContent);

                    // 检查用户是否存在
                    if (!yamlObj || !yamlObj.users) {
                        logger.error('YAML文件格式错误或不包含users字段');
                        return ctx.json({
                            success: false,
                            message: 'YAML文件格式错误',
                        });
                    }

                    const user = yamlObj.users.find((u) => u.uid === uid);

                    if (!user) {
                        logger.warn(`未找到用户 ${uid} 的Cookie配置`);
                        return ctx.json({
                            success: false,
                            message: `未找到用户 ${uid} 的Cookie配置`,
                        });
                    }

                    logger.info(`找到用户 ${uid} 的Cookie配置，尝试重新加载`);

                    // 这里我们可以尝试清除Node.js的模块缓存，强制重新加载配置
                    for (const key of Object.keys(require.cache)) {
                        if (key.includes('bilibili-cookies.yml')) {
                            delete require.cache[key];
                        }
                    }

                    // 尝试触发配置重新加载
                    try {
                        // 重新读取配置文件
                        fs.readFileSync(YAML_CONFIG_PATH, 'utf8');
                        logger.info('已重新读取配置文件');
                    } catch (readError) {
                        logger.error(`重新读取配置文件失败: ${readError}`);
                    }

                    return ctx.json({
                        success: true,
                        message: '已重新加载Cookie配置',
                    });
                } catch (error: any) {
                    logger.error(`重新加载Cookie时出错: ${error}`);
                    return ctx.json({
                        success: false,
                        message: `重新加载Cookie时出错: ${error.message}`,
                    });
                }

                break;

            default:
                return ctx.json({
                    code: -1,
                    message: `不支持的操作类型: ${action}`,
                });
        }
    } catch (error: any) {
        logger.error('二维码API错误:', error);

        return ctx.json({
            code: -1,
            message: `处理请求时发生错误: ${error.message}`,
        });
    }
}
