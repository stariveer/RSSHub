给我新增一个一级的路由 这个路由主要是用来代理我另外一个RSS的推送feed,将其内容进行过滤和加工, 
- 上游feed源码的url是这个格式:"https://we-mp-rss.trainspott.in/feed/MP_WXS_3941413004.atom" 
- 我希望新增的路由一级path为"we-mp-rss-proxy"
- 二级path应该为动态参数, :mp-id, 示例 "MP_WXS_3941413004"
- 三级path的话是代理的微信账号的类型 你可以先暂时设置成一个动态的:category参数 示例"travel", 
- 四级path为过滤条件了,比如必须包含的关键字,排除的关键字等,你可以帮我设计下这个url参数怎么传递
你先帮我把这个路由的架子搭起来,我在本地跑起来看看
