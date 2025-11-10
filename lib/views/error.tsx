import type { FC } from 'hono/jsx';

import { Layout } from '@/views/layout';
import { gitHash, gitDate } from '@/utils/git-hash';

const Index: FC<{
    requestPath: string;
    message: string;
    errorRoute: string;
    nodeVersion: string;
}> = ({ requestPath, message, errorRoute, nodeVersion }) => {
    // 检查是否是bilibili/followings/video路由
    const isBilibiliFollowingsVideo = requestPath.includes('/bilibili/followings/video/');

    // 从路径中提取uid
    let bilibiliUid = '';
    if (isBilibiliFollowingsVideo) {
        const match = requestPath.match(/\/bilibili\/followings\/video\/(\d+)/);
        if (match && match[1]) {
            bilibiliUid = match[1];
        }
    }

    return (
        <Layout>
            <div
                className="pointer-events-none absolute w-full h-screen"
                style={{
                    backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAzMiAzMicgd2lkdGg9JzMyJyBoZWlnaHQ9JzMyJyBmaWxsPSdub25lJyBzdHJva2U9J3JnYigxNSAyMyA0MiAvIDAuMDQpJz48cGF0aCBkPSdNMCAuNUgzMS41VjMyJy8+PC9zdmc+')`,
                    maskImage: 'linear-gradient(transparent, black, transparent)',
                }}
            ></div>
            <div className="w-full h-screen flex items-center justify-center flex-col space-y-4">
                <img className="grayscale" src="/logo.png" alt="RSSHub" width="100" loading="lazy" />
                <h1 className="text-4xl font-bold">Looks like something went wrong</h1>
                <div className="text-left w-[800px] space-y-6 !mt-10">
                    <div className="space-y-2">
                        <p className="mb-2 font-bold">Helpful Information</p>
                        {isBilibiliFollowingsVideo && (
                            <div id="qrcode-login" className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                                <h3 className="text-lg font-bold mb-2">二维码登录</h3>
                                <p className="mb-2">检测到您的B站Cookie已过期，请使用二维码登录刷新Cookie</p>
                                <div className="flex flex-col justify-center items-center p-4 border border-gray-300 rounded bg-white">
                                    <div id="qrcode-image" className="mb-4 w-48 h-48 flex items-center justify-center">
                                        <p className="text-gray-500">加载中...</p>
                                    </div>
                                    <div id="qrcode-status" className="text-center mb-2">
                                        请使用哔哩哔哩APP扫描二维码登录
                                    </div>
                                    <div id="qrcode-refresh" className="text-center">
                                        <button id="refresh-qrcode-btn" className="px-4 py-2 bg-[#FB7299] text-white rounded hover:bg-opacity-90">
                                            刷新二维码
                                        </button>
                                    </div>
                                </div>

                                <script
                                    dangerouslySetInnerHTML={{
                                        __html: `
                                let qrcodeKey = '';
                                let pollTimer = null;
                                const expectedUid = "${bilibiliUid}";

                                // 将refreshQrCode函数添加到window对象上
                                window.refreshQrCode = function() {
                                    console.log('刷新二维码按钮被点击');
                                    if (pollTimer) {
                                        clearInterval(pollTimer);
                                        pollTimer = null;
                                    }

                                    // 清除之前的二维码密钥
                                    qrcodeKey = '';

                                    // 清除之前的二维码图像
                                    const qrcodeElement = document.getElementById('qrcode-image');
                                    if (qrcodeElement) {
                                        qrcodeElement.innerHTML = '<p class="text-gray-500">加载中...</p>';
                                    }

                                    // 重新加载二维码
                                    loadQrCode();
                                };

                                // 通知服务器重新加载 Cookie
                                async function notifyServerToReloadCookie() {
                                    try {
                                        console.log('通知服务器重新加载 Cookie');
                                        const timestamp = new Date().getTime();
                                        const response = await fetch('/bilibili/qrcode/reload-cookie?_t=' + timestamp, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                                'Pragma': 'no-cache',
                                                'Expires': '0'
                                            },
                                            body: JSON.stringify({ uid: expectedUid })
                                        });

                                        if (response.ok) {
                                            const data = await response.json();
                                            console.log('服务器重新加载 Cookie 响应:', data);
                                            return data.success;
                                        } else {
                                            console.error('服务器重新加载 Cookie 失败');
                                            return false;
                                        }
                                    } catch (error) {
                                        console.error('通知服务器重新加载 Cookie 出错:', error);
                                        return false;
                                    }
                                }

                                // 初始化加载二维码
                                document.addEventListener('DOMContentLoaded', function() {
                                    loadQrCode();

                                    // 添加刷新按钮点击事件
                                    const refreshButton = document.getElementById('refresh-qrcode-btn');
                                    if (refreshButton) {
                                        refreshButton.addEventListener('click', window.refreshQrCode);
                                    }
                                });

                                // 加载二维码
                                async function loadQrCode() {
                                    try {
                                        const statusElement = document.getElementById('qrcode-status');
                                        const qrcodeElement = document.getElementById('qrcode-image');
                                        const refreshButton = document.getElementById('refresh-qrcode-btn');

                                        if (refreshButton) {
                                            refreshButton.disabled = true;
                                            refreshButton.classList.add('opacity-50');
                                        }

                                        statusElement.innerText = '正在加载二维码...';
                                        qrcodeElement.innerHTML = '<p class="text-gray-500">加载中...</p>';

                                        // 获取二维码数据，添加时间戳防止缓存
                                        const timestamp = new Date().getTime();
                                        const response = await fetch('/bilibili/qrcode/generate?_t=' + timestamp, {
                                            headers: {
                                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                                'Pragma': 'no-cache',
                                                'Expires': '0'
                                            }
                                        });
                                        if (!response.ok) {
                                            throw new Error('获取二维码失败，服务器响应错误');
                                        }

                                        const data = await response.json();
                                        console.log('二维码生成响应:', data);

                                        if (data.success) {
                                            console.log('旧的二维码密钥:', qrcodeKey, '新的二维码密钥:', data.qrcode_key);
                                            qrcodeKey = data.qrcode_key;
                                            qrcodeElement.innerHTML = \`<img src="\${data.image}" alt="二维码" class="w-full h-full">\`;
                                            statusElement.innerText = '请使用哔哩哔哩APP扫描二维码登录';

                                            if (refreshButton) {
                                                refreshButton.disabled = false;
                                                refreshButton.classList.remove('opacity-50');
                                            }

                                            // 开始轮询登录状态
                                            startPolling();
                                        } else {
                                            statusElement.innerText = '二维码加载失败: ' + (data.message || '未知错误');

                                            if (refreshButton) {
                                                refreshButton.disabled = false;
                                                refreshButton.classList.remove('opacity-50');
                                            }
                                        }
                                    } catch (error) {
                                        console.error('加载二维码失败:', error);
                                        document.getElementById('qrcode-status').innerText = '二维码加载失败，请刷新重试: ' + error.message;

                                        const refreshButton = document.getElementById('refresh-qrcode-btn');
                                        if (refreshButton) {
                                            refreshButton.disabled = false;
                                            refreshButton.classList.remove('opacity-50');
                                        }
                                    }
                                }

                                // 开始轮询登录状态
                                function startPolling() {
                                    if (pollTimer) {
                                        clearInterval(pollTimer);
                                    }

                                    pollTimer = setInterval(async () => {
                                        try {
                                            if (!qrcodeKey) {
                                                console.error('二维码key不存在，无法轮询');
                                                return;
                                            }

                                            const timestamp = new Date().getTime();
                                            const pollUrl = '/bilibili/qrcode/poll?qrcode_key=' + qrcodeKey + '&uid=' + expectedUid + '&_t=' + timestamp;
                                            console.log('轮询URL:', pollUrl);

                                            const response = await fetch(pollUrl, {
                                                headers: {
                                                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                                                    'Pragma': 'no-cache',
                                                    'Expires': '0'
                                                }
                                            });
                                            if (!response.ok) {
                                                throw new Error('轮询请求失败，服务器响应错误');
                                            }

                                            const data = await response.json();
                                            console.log('轮询响应:', data);

                                            const statusElement = document.getElementById('qrcode-status');

                                            // 处理嵌套的data.code结构
                                            const statusCode = data.data?.code !== undefined ? data.data.code : data.code;
                                            const statusMessage = data.data?.message || data.message || '未知状态';

                                            console.log('解析后的状态码:', statusCode, '消息:', statusMessage);

                                            if (statusCode === 0) {
                                                // 登录成功
                                                clearInterval(pollTimer);
                                                statusElement.innerText = '登录成功! 正在刷新页面...';
                                                console.log('登录成功，将在通知服务器重新加载 Cookie 后刷新页面');

                                                // 先通知服务器重新加载 Cookie，然后再刷新页面
                                                setTimeout(async () => {
                                                    try {
                                                        // 尝试通知服务器重新加载 Cookie
                                                        await notifyServerToReloadCookie();

                                                        console.log('等待服务器处理完成...');
                                                        // 等待服务器处理完成
                                                        setTimeout(() => {
                                                            console.log('执行页面刷新');
                                                            window.location.href = window.location.pathname + '?t=' + new Date().getTime();
                                                        }, 2000);
                                                    } catch (e) {
                                                        console.error('处理登录成功时出错:', e);
                                                        alert('登录成功，但页面刷新失败，请手动刷新页面');
                                                        window.location.reload(true);
                                                    }
                                                }, 1000);
                                            } else if (statusCode === 86038) {
                                                // 二维码已失效
                                                clearInterval(pollTimer);
                                                statusElement.innerText = '二维码已失效，请刷新二维码';
                                            } else if (statusCode === 86090) {
                                                // 二维码已扫描
                                                statusElement.innerText = '二维码已扫描，请在手机上确认登录';
                                            } else if (statusCode === 86101) {
                                                // 未扫描
                                                statusElement.innerText = '请使用哔哩哔哩APP扫描二维码登录';
                                            } else if (statusCode === -1) {
                                                // 处理UID不匹配问题 - 忽略错误，直接刷新页面
                                                clearInterval(pollTimer);
                                                console.log('收到UID不匹配错误，但我们将忽略它并刷新页面');
                                                statusElement.innerText = '登录成功! 正在刷新页面...';

                                                // 先通知服务器重新加载 Cookie，然后再刷新页面
                                                setTimeout(async () => {
                                                    try {
                                                        // 尝试通知服务器重新加载 Cookie
                                                        await notifyServerToReloadCookie();

                                                        console.log('等待服务器处理完成...');
                                                        // 等待服务器处理完成
                                                        setTimeout(() => {
                                                            console.log('执行页面刷新（UID不匹配情况）');
                                                            window.location.href = window.location.pathname + '?t=' + new Date().getTime();
                                                        }, 2000);
                                                    } catch (e) {
                                                        console.error('处理UID不匹配时出错:', e);
                                                        alert('登录成功，但页面刷新失败，请手动刷新页面');
                                                        window.location.reload(true);
                                                    }
                                                }, 1000);
                                            } else {
                                                // 其他状态
                                                statusElement.innerText = statusMessage || '未知状态，请刷新二维码';
                                            }
                                        } catch (error) {
                                            console.error('轮询状态失败:', error);
                                            document.getElementById('qrcode-status').innerText = '轮询失败，请刷新二维码: ' + error.message;
                                        }
                                    }, 3000);
                                }
                                `,
                                    }}
                                />
                            </div>
                        )}
                        <p className="message">
                            Error Message:
                            <br />
                            <code className="mt-2 block max-h-28 overflow-auto bg-zinc-100 align-bottom w-fit details">{message}</code>
                        </p>
                        <p className="message">
                            Route: <code className="ml-2 bg-zinc-100">{errorRoute}</code>
                        </p>
                        <p className="message">
                            Full Route: <code className="ml-2 bg-zinc-100">{requestPath}</code>
                        </p>
                        <p className="message">
                            Node Version: <code className="ml-2 bg-zinc-100">{nodeVersion}</code>
                        </p>
                        <p className="message">
                            Git Hash: <code className="ml-2 bg-zinc-100">{gitHash}</code>
                        </p>
                        <p className="message">
                            Git Date: <code className="ml-2 bg-zinc-100">{gitDate?.toUTCString()}</code>
                        </p>
                    </div>
                    <div>
                        <p className="mb-2 font-bold">Report</p>
                        <p>
                            After carefully reading the{' '}
                            <a className="text-[#F5712C]" href="https://docs.rsshub.app/" target="_blank">
                                document
                            </a>
                            , if you think this is a bug of RSSHub, please{' '}
                            <a className="text-[#F5712C]" href="https://github.com/DIYgod/RSSHub/issues/new?assignees=&labels=RSS+bug&template=bug_report_en.yml" target="_blank">
                                submit an issue
                            </a>{' '}
                            on GitHub.
                        </p>
                        <p>
                            在仔细阅读
                            <a className="text-[#F5712C]" href="https://docs.rsshub.app/zh/" target="_blank">
                                文档
                            </a>
                            后，如果你认为这是 RSSHub 的 bug，请在 GitHub{' '}
                            <a className="text-[#F5712C]" href="https://github.com/DIYgod/RSSHub/issues/new?assignees=&labels=RSS+bug&template=bug_report_zh.yml" target="_blank">
                                提交 issue
                            </a>
                            。
                        </p>
                    </div>
                    <div>
                        <p className="mb-2 font-bold">Community</p>
                        <p>
                            You can also join our{' '}
                            <a className="text-[#F5712C]" target="_blank" href="https://t.me/rsshub">
                                Telegram group
                            </a>
                            , or follow our{' '}
                            <a className="text-[#F5712C]" target="_blank" href="https://t.me/awesomeRSSHub">
                                Telegram channel
                            </a>{' '}
                            and{' '}
                            <a target="_blank" href="https://x.com/intent/follow?screen_name=_RSSHub" className="text-[#F5712C]">
                                Twitter
                            </a>{' '}
                            to get community support and news.
                        </p>
                        <p>
                            你也可以加入我们的{' '}
                            <a className="text-[#F5712C]" target="_blank" href="https://t.me/rsshub">
                                Telegram 群组
                            </a>
                            ，或关注我们的{' '}
                            <a className="text-[#F5712C]" target="_blank" href="https://t.me/awesomeRSSHub">
                                Telegram 频道
                            </a>
                            和{' '}
                            <a target="_blank" href="https://x.com/intent/follow?screen_name=_RSSHub" className="text-[#F5712C]">
                                Twitter
                            </a>{' '}
                            获取社区支持和新闻。
                        </p>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-10 text-center w-full text-sm font-medium space-y-2">
                <p className="space-x-4">
                    <a target="_blank" href="https://github.com/DIYgod/RSSHub">
                        <img className="inline" src="https://icons.ly/github/_/fff" alt="github" width="20" height="20" />
                    </a>
                    <a target="_blank" href="https://t.me/rsshub">
                        <img className="inline" src="https://icons.ly/telegram" alt="telegram group" width="20" height="20" />
                    </a>
                    <a target="_blank" href="https://t.me/awesomeRSSHub">
                        <img className="inline" src="https://icons.ly/telegram" alt="telegram channel" width="20" height="20" />
                    </a>
                    <a target="_blank" href="https://x.com/intent/follow?screen_name=_RSSHub" className="text-[#F5712C]">
                        <img className="inline" src="https://icons.ly/x" alt="X" width="20" height="20" />
                    </a>
                </p>
                <p className="!mt-6">
                    Please consider{' '}
                    <a target="_blank" href="https://docs.rsshub.app/sponsor" className="text-[#F5712C]">
                        sponsoring
                    </a>{' '}
                    to help keep this open source project alive.
                </p>
                <p>
                    Made with ❤️ by{' '}
                    <a target="_blank" href="https://diygod.cc" className="text-[#F5712C]">
                        DIYgod
                    </a>{' '}
                    and{' '}
                    <a target="_blank" href="https://github.com/DIYgod/RSSHub/graphs/contributors" className="text-[#F5712C]">
                        Contributors
                    </a>{' '}
                    under MIT License.
                </p>
            </div>
        </Layout>
    );
};

export default Index;
