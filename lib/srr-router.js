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

// v2ex
router.get('/v2ex/topics/:type', lazyloadRouteHandler('./routes/v2ex/topics'));
router.get('/v2ex/post/:postid', lazyloadRouteHandler('./routes/v2ex/post'));
router.get('/v2ex/tab/:tabid', lazyloadRouteHandler('./routes/v2ex/tab'));

// 微博
router.get('/weibo/user/:uid/:routeParams?', lazyloadRouteHandler('./routes/weibo/user'));
router.get('/weibo/keyword/:keyword/:routeParams?', lazyloadRouteHandler('./routes/weibo/keyword'));
router.get('/weibo/search/hot', lazyloadRouteHandler('./routes/weibo/search/hot'));
router.get('/weibo/super_index/:id/:type?/:routeParams?', lazyloadRouteHandler('./routes/weibo/super_index'));
router.get('/weibo/oasis/user/:userid', lazyloadRouteHandler('./routes/weibo/oasis/user'));

// 微博个人时间线
router.get('/weibo/timeline/:uid/:feature?/:routeParams?', lazyloadRouteHandler('./routes/weibo/timeline'));

// stariveer
router.get('/toodaylab/city/:city?', lazyloadRouteHandler('./routes/toodaylab/city'));
router.get('/4563/:cat?', lazyloadRouteHandler('./routes/4563/cat'));
router.get('/btnull/:cate/:score/:year', lazyloadRouteHandler('./routes/btnull/btnull'));

module.exports = router;
