module.exports = {
  apps: [
    {
      name: 'rsshub',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
      cwd: '/www/wwwroot/rsshub.trainspott.in',
    },
  ],
};
