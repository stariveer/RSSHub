有几个公众号 :
- E旅行网特价神器(rss订阅:https://we-mp-rss.trainspott.in/feed/MP_WXS_3941413004.atom)
- E旅行网(https://we-mp-rss.trainspott.in/feed/MP_WXS_2395030160.atom)
- 旅行雷达(https://we-mp-rss.trainspott.in/feed/MP_WXS_3074432418.atom)

这几个公众号我只关注正文里有"成都"2字的文章, 能否在rss输出之前帮我过滤,过滤范围仅包含这几个公众号,过滤条件是rss只输出正文里有"成都"2字的文章, 如果需要改代码实现,我希望改的代码通过挂载到容器外面的方式持久化, 这样每次重启都能生效, 你先看下现在的代码实现, (参考./we-mp-rss/we-mp-rss-source-code 下的源码内容,但不要改这里的内容, )构思下可行性

https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_3941413004/travel/+成都
https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_2395030160/travel/+成都
https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_3074432418/travel/+成都


https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_3941413004/travel/+成都,-这个不太可能出现
https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_2395030160/travel/+成都,-这个不太可能出现
https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_3074432418/travel/+成都,-这个不太可能出现
https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_3537070890/travel/+成都
---

https://we-mp-rss.trainspott.in/feed/MP_WXS_2397228061.atom
http://localhost:1200/we-mp-rss-proxy/MP_WXS_2397228061/lande
https://rsshub.trainspott.in/we-mp-rss-proxy/MP_WXS_2397228061/lande


http://localhost:1200/we-mp-rss-proxy/MP_WXS_2397228061/lande 现在返回的description 太多富文本了,我只想要关键的有用信息, 然后以table显示展示, 这个过程可能需要你先过滤文本, 然后将其解析成结构化的数据, 你先思考一下

http://localhost:1200/we-mp-rss-proxy/MP_WXS_2397228061/lande/
