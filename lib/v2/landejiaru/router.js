module.exports = function (router) {
    router.get('/my', require('./my'));
    router.get('/my2', require('./my'));
    router.get('/my3', require('./my'));
};
