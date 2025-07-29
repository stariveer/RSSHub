module.exports = {
  apps: [
    {
      name: 'rsshub',
      script: 'node_modules/.bin/tsx',
      args: 'lib/index.ts',
      env: {
        NODE_ENV: 'production',
      },
      cwd: '/www/wwwroot/rsshub.trainspott.in',
    },
  ],
};
