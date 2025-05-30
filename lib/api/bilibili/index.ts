import { generateQrCodeKey, generateQrCodeImage, pollQrCodeStatus, verifyUserUid, saveCookie } from '../../routes/bilibili/qrcode-login';
import logger from '../../utils/logger';

type AnyHono = any;

export function setupBilibiliApi(app: AnyHono) {
    // 生成二维码
    app.get('/bilibili/qrcode/generate', async (ctx) => {
        try {
            // 生成二维码
            const qrcodeData = await generateQrCodeKey();
            const image = await generateQrCodeImage(qrcodeData.url);

            return ctx.json({
                success: true,
                qrcode_key: qrcodeData.qrcode_key,
                image,
                url: qrcodeData.url
            });
        } catch (error: any) {
            logger.error('二维码API错误:', error);
            return ctx.json({
                success: false,
                message: '服务器错误: ' + error.message
            }, 500);
        }
    });

    // 轮询二维码状态
    app.get('/bilibili/qrcode/poll', async (ctx) => {
        try {
            // 获取查询参数
            const qrcodeKey = ctx.req.query('qrcode_key');
            const expectedUid = ctx.req.query('uid');

            if (!qrcodeKey) {
                return ctx.json({
                    success: false,
                    message: '缺少必要参数'
                });
            }

            // 轮询二维码状态
            const pollResult = await pollQrCodeStatus(qrcodeKey);

            // 如果登录成功
            if (pollResult.code === 0 && pollResult.data.code === 0) {
                const cookies = pollResult.data.cookie;

                // 验证UID是否匹配
                if (expectedUid && !verifyUserUid(cookies, expectedUid)) {
                    // 获取实际的UID
                    const actualUid = cookies.match(/DedeUserID=(\d+)/)?.[1] || '未知';

                    return ctx.json({
                        code: -1,
                        message: 'UID不匹配',
                        data: actualUid
                    });
                }

                // 保存Cookie到YAML文件
                if (expectedUid) {
                    await saveCookie(expectedUid, cookies);
                }

                return ctx.json({
                    code: 0,
                    message: '登录成功'
                });
            }

            // 返回原始状态
            return ctx.json({
                code: pollResult.data.code,
                message: pollResult.data.message
            });
        } catch (error: any) {
            logger.error('二维码状态轮询错误:', error);
            return ctx.json({
                success: false,
                message: '服务器错误: ' + error.message
            }, 500);
        }
    });
}
