/* eslint:disable */
const http = require('http');
const spawn = require('child_process').spawn;
const createHandler = require('github-webhook-handler');

// 下面填写的myscrect跟github webhooks配置一样，下一步会说；path是我们访问的路径
const handler = createHandler({
    path: '/auto_build',
    secret: '6dhgjL6af8FGfDLJyYNc@', // 自己生成一个秘钥字符串, 自己记住别忘了, 待会github配置要用
});

http.createServer((req, res) => {
    handler(req, res, () => {
        res.statusCode = 404;
        res.end('no such location');
    });
}).listen(6669);

handler.on('error', (err) => {
    console.error('Error:', err.message);
});

// 监听到push事件的时候执行我们的自动化脚本
handler.on('push', (event) => {
    console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);

    runCommand('sh', ['./deploy.sh'], (txt) => {
        console.log(txt);
    });
});

function runCommand(cmd, args, callback) {
    const child = spawn(cmd, args);
    let resp = 'Deploy OK';
    child.stdout.on('data', (buffer) => {
        resp += buffer.toString();
    });
    child.stdout.on('end', () => {
        callback(resp);
    });
}

// 如果需要监听issues，打开下面的代码
//  handler.on('issues', function (event) {
//    console.log('Received an issue event for %s action=%s: #%d %s',
//      event.payload.repository.name,
//      event.payload.action,
//      event.payload.issue.number,
//      event.payload.issue.title)
// });

/* eslint:enable */
