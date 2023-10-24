// npm i -S http child_process github-webhook-handler
// pm2 start /www/wwwroot/rsshub.trainspott.in/rsshub-webhookHandler.js --name="rsshub-webhookHandler"
// pm2 save

const http = require('http');
const spawn = require('child_process').spawn;
const createHandler = require('github-webhook-handler');

// 下面填写的myscrect跟github webhooks配置一样，下一步会说；path是我们访问的路径
const handler = createHandler({
    path: '/auto_build',
    secret: '535xgGFSDg@',
});

http.createServer((req, res) => {
    handler(req, res, (err) => {
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
        console.log('==23');
        console.log(txt);
    });
});
function runCommand(cmd, args, callback) {
    console.log('==cmd', cmd);
    console.log('==args', args);
    const child = spawn(cmd, args);
    console.log('==2');
    let resp = 'Deploy OK';
    console.log('==3');
    child.stdout.on('data', (buffer) => {
        console.log('==4');
        resp += buffer.toString();
    });
    child.stdout.on('end', () => {
        console.log('==end');
        callback(resp);
    });
}

// 由于我们不需要监听issues，所以下面代码注释掉
handler.on('issues', function (event) {
    console.log('Received an issue event for %s action=%s: #%d %s', event.payload.repository.name, event.payload.action, event.payload.issue.number, event.payload.issue.title);
});
