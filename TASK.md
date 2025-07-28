env:
JANDAN_WLT_PAGES=1,2,3
JANDAN_WLT_VOTE_POSITIVE=10
JANDAN_WLT_POSITIVE_RATE=0.8
JANDAN_WLT_SIZE_LIMIT=10
JANDAN_WLT_AUTHOR_BLACKLIST=猫与牛仔裤,每日美足,墨鱼蛋
JANDAN_WLT_API_URL=https://jandan.net/api/comment/post/26402

@lib/routes/jandan-wlt-v2/wlt.ts
@lib/routes/jandan-wlt-v2/config.ts

url: `${apiUrl}?order=desc&page=${page}`,

最近api升级了，order好像没用了，需要自己处理

你访问 https://jandan.net/api/comment/post/26402 看看，你可以用playwright访问，然后获取到数据，然后处理，cookie没有的话我可以帮你搞

返回值里有
"total_pages": 1, // 总页数
"current_page": 1, // 当前页数

现在desc 好像没用了，要用total_pages 和 current_page 来处理, 倒着取，帮我实现，其他的功能不要动






