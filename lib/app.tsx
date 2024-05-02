import '@/utils/request-rewriter';

import { Hono } from 'hono';

import { compress } from 'hono/compress';
import mLogger from '@/middleware/logger';
import cache from '@/middleware/cache';
import template from '@/middleware/template';
import sentry from '@/middleware/sentry';
import accessControl from '@/middleware/access-control';
import debug from '@/middleware/debug';
import header from '@/middleware/header';
import antiHotlink from '@/middleware/anti-hotlink';
import parameter from '@/middleware/parameter';
import { jsxRenderer } from 'hono/jsx-renderer';
import { trimTrailingSlash } from 'hono/trailing-slash';

import logger from '@/utils/logger';
import { generateQrCodeKey, generateQrCodeImage, pollQrCodeStatus, verifyUserUid, saveCookie } from './routes/bilibili/qrcode-login';

import { notFoundHandler, errorHandler } from '@/errors';
import registry from '@/registry';
import api from '@/api';

process.on('uncaughtException', (e) => {
    logger.error('uncaughtException: ' + e);
});

const app = new Hono();

app.use(trimTrailingSlash());
app.use(compress());

app.use(
    jsxRenderer(({ children }) => <>{children}</>, {
        docType: '<?xml version="1.0" encoding="UTF-8"?>',
        stream: {},
    })
);
app.use(mLogger);
app.use(sentry);
app.use(accessControl);
app.use(debug);
app.use(template);
app.use(header);
app.use(antiHotlink);
app.use(parameter);
app.use(cache);

// B站二维码登录API
app.get('/bilibili/qrcode/generate', async (ctx) => {
    try {
        // 生成二维码
        const qrcodeData = await generateQrCodeKey();
        const image = await generateQrCodeImage(qrcodeData.url);

        return ctx.json({
            success: true,
            qrcode_key: qrcodeData.qrcode_key,
            image,
            url: qrcodeData.url,
        });
    } catch (error: any) {
        logger.error('二维码API错误:', error);
        return ctx.json(
            {
                success: false,
                message: '服务器错误: ' + error.message,
            },
            500
        );
    }
});

// B站二维码状态轮询API
app.get('/bilibili/qrcode/poll', async (ctx) => {
    try {
        // 获取查询参数
        const qrcodeKey = ctx.req.query('qrcode_key');
        const expectedUid = ctx.req.query('uid');

        if (!qrcodeKey) {
            return ctx.json({
                success: false,
                message: '缺少必要参数',
            });
        }

        // 轮询二维码状态
        const pollResult = await pollQrCodeStatus(qrcodeKey);

        // 如果登录成功
        if (pollResult.code === 0 && pollResult.data.code === 0) {
            const cookies = pollResult.data.cookie;

            // 提取实际登录用户的 UID
            const actualUid = cookies.match(/DedeUserID=(\d+)/)?.[1];

            if (actualUid) {
                // 保存Cookie到YAML文件，使用登录用户的 UID
                await saveCookie(actualUid, cookies);
            } else {
                logger.warn('无法从扫码结果中提取 DedeUserID，将尝试保存，但可能无法正常工作');
                // 回退策略：随便生成一个随机ID或者用 expectedUid（不推荐，但为了兼容旧代码结构）
                await saveCookie(expectedUid || 'unknown', cookies);
            }

            return ctx.json({
                code: 0,
                message: '登录成功',
            });
        }

        // 返回原始状态
        return ctx.json({
            code: pollResult.data.code,
            message: pollResult.data.message,
        });
    } catch (error: any) {
        logger.error('二维码状态轮询错误:', error);
        return ctx.json(
            {
                success: false,
                message: '服务器错误: ' + error.message,
            },
            500
        );
    }
});

app.route('/', registry);
app.route('/api', api);

app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
