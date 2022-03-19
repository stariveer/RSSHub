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

// bilibili
router.get('/bilibili/user/video/:uid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/video'));
router.get('/bilibili/user/article/:uid', lazyloadRouteHandler('./routes/bilibili/article'));
router.get('/bilibili/user/fav/:uid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/userFav'));
router.get('/bilibili/user/coin/:uid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/coin'));
router.get('/bilibili/user/dynamic/:uid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/dynamic'));
router.get('/bilibili/user/followers/:uid', lazyloadRouteHandler('./routes/bilibili/followers'));
router.get('/bilibili/user/followings/:uid', lazyloadRouteHandler('./routes/bilibili/followings'));
router.get('/bilibili/user/bangumi/:uid/:type?', lazyloadRouteHandler('./routes/bilibili/user_bangumi'));
router.get('/bilibili/partion/:tid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/partion'));
router.get('/bilibili/partion/ranking/:tid/:days?/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/partion-ranking'));
router.get('/bilibili/bangumi/:seasonid', lazyloadRouteHandler('./routes/bilibili/bangumi')); // 弃用
router.get('/bilibili/bangumi/media/:mediaid', lazyloadRouteHandler('./routes/bilibili/bangumi'));
router.get('/bilibili/video/page/:bvid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/page'));
router.get('/bilibili/video/reply/:bvid', lazyloadRouteHandler('./routes/bilibili/reply'));
router.get('/bilibili/video/danmaku/:bvid/:pid?', lazyloadRouteHandler('./routes/bilibili/danmaku'));
router.get('/bilibili/link/news/:product', lazyloadRouteHandler('./routes/bilibili/linkNews'));
router.get('/bilibili/live/room/:roomID', lazyloadRouteHandler('./routes/bilibili/liveRoom'));
router.get('/bilibili/live/search/:key/:order', lazyloadRouteHandler('./routes/bilibili/liveSearch'));
router.get('/bilibili/live/area/:areaID/:order', lazyloadRouteHandler('./routes/bilibili/liveArea'));
router.get('/bilibili/fav/:uid/:fid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/fav'));
router.get('/bilibili/blackboard', lazyloadRouteHandler('./routes/bilibili/blackboard'));
router.get('/bilibili/mall/new/:category?', lazyloadRouteHandler('./routes/bilibili/mallNew'));
router.get('/bilibili/mall/ip/:id', lazyloadRouteHandler('./routes/bilibili/mallIP'));
router.get('/bilibili/ranking/:rid?/:day?/:arc_type?/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/ranking'));
router.get('/bilibili/user/channel/:uid/:cid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/userChannel'));
router.get('/bilibili/topic/:topic', lazyloadRouteHandler('./routes/bilibili/topic'));
router.get('/bilibili/audio/:id', lazyloadRouteHandler('./routes/bilibili/audio'));
router.get('/bilibili/vsearch/:kw/:order?/:disableEmbed?/:tid?', lazyloadRouteHandler('./routes/bilibili/vsearch'));
router.get('/bilibili/followings/dynamic/:uid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/followings_dynamic'));
router.get('/bilibili/followings/video/:uid/:disableEmbed?', lazyloadRouteHandler('./routes/bilibili/followings_video'));
router.get('/bilibili/followings/article/:uid', lazyloadRouteHandler('./routes/bilibili/followings_article'));
router.get('/bilibili/readlist/:listid', lazyloadRouteHandler('./routes/bilibili/readlist'));
router.get('/bilibili/weekly', lazyloadRouteHandler('./routes/bilibili/weekly_recommend'));
router.get('/bilibili/manga/update/:comicid', lazyloadRouteHandler('./routes/bilibili/manga_update'));
router.get('/bilibili/manga/followings/:uid/:limits?', lazyloadRouteHandler('./routes/bilibili/manga_followings'));
router.get('/bilibili/app/:id?', lazyloadRouteHandler('./routes/bilibili/app'));

// GitHub
router.get('/github/repos/:user', lazyloadRouteHandler('./routes/github/repos'));
router.get('/github/trending/:since/:language?', lazyloadRouteHandler('./routes/github/trending'));
router.get('/github/issue/:user/:repo/:state?/:labels?', lazyloadRouteHandler('./routes/github/issue'));
router.get('/github/pull/:user/:repo', lazyloadRouteHandler('./routes/github/pulls'));
router.get('/github/user/followers/:user', lazyloadRouteHandler('./routes/github/follower'));
router.get('/github/stars/:user/:repo', lazyloadRouteHandler('./routes/github/star'));
router.get('/github/search/:query/:sort?/:order?', lazyloadRouteHandler('./routes/github/search'));
router.get('/github/branches/:user/:repo', lazyloadRouteHandler('./routes/github/branches'));
router.get('/github/file/:user/:repo/:branch/:filepath+', lazyloadRouteHandler('./routes/github/file'));
router.get('/github/starred_repos/:user', lazyloadRouteHandler('./routes/github/starred_repos'));
router.get('/github/contributors/:user/:repo/:order?/:anon?', lazyloadRouteHandler('./routes/github/contributors'));
router.get('/github/topics/:name/:qs?', lazyloadRouteHandler('./routes/github/topic'));

// 知乎
router.get('/zhihu/collection/:id', lazyloadRouteHandler('./routes/zhihu/collection'));
router.get('/zhihu/people/activities/:id', lazyloadRouteHandler('./routes/zhihu/activities'));
router.get('/zhihu/people/answers/:id', lazyloadRouteHandler('./routes/zhihu/answers'));
router.get('/zhihu/posts/:usertype/:id', lazyloadRouteHandler('./routes/zhihu/posts'));
router.get('/zhihu/zhuanlan/:id', lazyloadRouteHandler('./routes/zhihu/zhuanlan'));
router.get('/zhihu/daily', lazyloadRouteHandler('./routes/zhihu/daily'));
router.get('/zhihu/daily/section/:sectionId', lazyloadRouteHandler('./routes/zhihu/daily_section'));
router.get('/zhihu/hotlist', lazyloadRouteHandler('./routes/zhihu/hotlist'));
router.get('/zhihu/pin/hotlist', lazyloadRouteHandler('./routes/zhihu/pin/hotlist'));
router.get('/zhihu/question/:questionId', lazyloadRouteHandler('./routes/zhihu/question'));
router.get('/zhihu/topic/:topicId', lazyloadRouteHandler('./routes/zhihu/topic'));
router.get('/zhihu/people/pins/:id', lazyloadRouteHandler('./routes/zhihu/pin/people'));
router.get('/zhihu/bookstore/newest', lazyloadRouteHandler('./routes/zhihu/bookstore/newest'));
router.get('/zhihu/pin/daily', lazyloadRouteHandler('./routes/zhihu/pin/daily'));
router.get('/zhihu/weekly', lazyloadRouteHandler('./routes/zhihu/weekly'));
router.get('/zhihu/timeline', lazyloadRouteHandler('./routes/zhihu/timeline'));
router.get('/zhihu/hot/:category?', lazyloadRouteHandler('./routes/zhihu/hot'));

// 煎蛋
router.get('/jandan/article', lazyloadRouteHandler('./routes/jandan/article'));
router.get('/jandan/:sub_model', lazyloadRouteHandler('./routes/jandan/pic'));

// 喷嚏
router.get('/dapenti/tugua', lazyloadRouteHandler('./routes/dapenti/tugua'));
router.get('/dapenti/subject/:id', lazyloadRouteHandler('./routes/dapenti/subject'));

// 懂球帝
router.get('/dongqiudi/daily', lazyloadRouteHandler('./routes/dongqiudi/daily'));
router.get('/dongqiudi/result/:team', lazyloadRouteHandler('./routes/dongqiudi/result'));
router.get('/dongqiudi/team_news/:team', lazyloadRouteHandler('./routes/dongqiudi/team_news'));
router.get('/dongqiudi/player_news/:id', lazyloadRouteHandler('./routes/dongqiudi/player_news'));
router.get('/dongqiudi/special/:id', lazyloadRouteHandler('./routes/dongqiudi/special'));
router.get('/dongqiudi/top_news/:id?', lazyloadRouteHandler('./routes/dongqiudi/top_news'));

// 什么值得买
router.get('/smzdm/keyword/:keyword', lazyloadRouteHandler('./routes/smzdm/keyword'));
router.get('/smzdm/ranking/:rank_type/:rank_id/:hour', lazyloadRouteHandler('./routes/smzdm/ranking'));
router.get('/smzdm/haowen/:day?', lazyloadRouteHandler('./routes/smzdm/haowen'));
router.get('/smzdm/haowen/fenlei/:name/:sort?', lazyloadRouteHandler('./routes/smzdm/haowen_fenlei'));
router.get('/smzdm/article/:uid', lazyloadRouteHandler('./routes/smzdm/article'));
router.get('/smzdm/baoliao/:uid', lazyloadRouteHandler('./routes/smzdm/baoliao'));

// 电影首发站
router.get('/dysfz', lazyloadRouteHandler('./routes/dysfz/index'));

// w
router.get('/wechat/feeds/:id', lazyloadRouteHandler('./routes/tencent/wechat/feeds'));

// stariveer
router.get('/toodaylab/city/:city?', lazyloadRouteHandler('./routes/toodaylab/city'));
router.get('/4563/:cat?', lazyloadRouteHandler('./routes/4563/cat'));
router.get('/github/trending/:since/:language?/:spokenLanguage?', lazyloadRouteHandler('./routes/github/trending'));

module.exports = router;
