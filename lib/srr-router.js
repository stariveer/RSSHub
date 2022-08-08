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
router.get('/smzdm/keyword/:keyword', lazyloadRouteHandler('./routes/smzdm/keyword'));
router.get('/smzdm/ranking/:rank_type/:rank_id/:hour', lazyloadRouteHandler('./routes/smzdm/ranking'));
router.get('/smzdm/haowen/:day?', lazyloadRouteHandler('./routes/smzdm/haowen'));
router.get('/smzdm/haowen/fenlei/:name/:sort?', lazyloadRouteHandler('./routes/smzdm/haowen_fenlei'));
router.get('/smzdm/article/:uid', lazyloadRouteHandler('./routes/smzdm/article'));
router.get('/smzdm/baoliao/:uid', lazyloadRouteHandler('./routes/smzdm/baoliao'));

// stariveer
router.get('/toodaylab/city/:city?', lazyloadRouteHandler('./routes/toodaylab/city'));
router.get('/4563/:cat?', lazyloadRouteHandler('./routes/4563/cat'));
router.get('/btnull/:cate/:score/:year', lazyloadRouteHandler('./routes/btnull/btnull'));

module.exports = router;
