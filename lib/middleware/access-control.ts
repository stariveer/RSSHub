import type { MiddlewareHandler } from 'hono';
import { config } from '@/config';
import md5 from '@/utils/md5';
import RejectError from '@/errors/types/reject';
import { getRouteNameFromPath } from '@/utils/helpers';

const reject = (message = 'Authentication failed. Access denied.') => {
    throw new RejectError(message);
};

const middleware: MiddlewareHandler = async (ctx, next) => {
    const requestPath = ctx.req.path;
    const accessKey = ctx.req.query('key');
    const accessCode = ctx.req.query('code');

    if (requestPath === '/' || requestPath === '/robots.txt' || requestPath === '/favicon.ico' || requestPath === '/logo.png') {
        await next();
    } else {
        if (config.accessKey && !(config.accessKey === accessKey || accessCode === md5(requestPath + config.accessKey))) {
            return reject('Authentication failed. Access denied.');
        }

        if (config.routeWhiteList) {
            const routeName = getRouteNameFromPath(requestPath);
            if (routeName) {
                const whiteList = config.routeWhiteList.split(',').map((name) => name.trim());
                if (!whiteList.includes(routeName)) {
                    return reject(`Route '${routeName}' is not in the white list.`);
                }
            }
        }

        await next();
    }
};

export default middleware;
