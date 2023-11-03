// v2 的 见 lib/v2router.js
const Router = require('@koa/router');
const router = new Router();

const RouterHandlerMap = new Map();

// 懒加载 Route Handler，Route 首次被请求时才会 require 相关文件
const lazyloadRouteHandler = (routeHandlerPath) => (ctx) => {
    if (RouterHandlerMap.has(routeHandlerPath)) {
        return RouterHandlerMap.get(routeHandlerPath)(ctx);
    }

    const handler = require(routeHandlerPath);
    RouterHandlerMap.set(routeHandlerPath, handler);
    return handler(ctx);
};

// 什么值得买
// 见 lib/v2router.js /smzdm-srr/router.js

// 西瓜视频
// 见 lib/v2router.js /ixigua

// v2ex
router.get('/v2ex/topics/:type', lazyloadRouteHandler('./routes/v2ex/topics'));
router.get('/v2ex/post/:postid', lazyloadRouteHandler('./routes/v2ex/post'));
router.get('/v2ex/tab/:tabid/:keyword?', lazyloadRouteHandler('./routes/v2ex/tab'));
router.get('/v2ex/tab-am-tw/:tabid', lazyloadRouteHandler('./routes/v2ex/tab-am-tw'));


// stariveer
router.get('/toodaylab/city/:city?', lazyloadRouteHandler('./routes/toodaylab/city'));
router.get('/4563/:cat?', lazyloadRouteHandler('./routes/4563/cat'));
router.get('/btnull/:cate/:score/:year', lazyloadRouteHandler('./routes/btnull/btnull'));

module.exports = router;
