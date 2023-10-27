module.exports = function (router) {
    router.get('/wechat2rss/:id', require('./wechat2rss'));
    router.get('/my', require('./my'));
    router.get('/my2', require('./my'));
    router.get('/my3', require('./my'));
};
