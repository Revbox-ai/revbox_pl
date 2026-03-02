module.exports = {
  apps: [{
    name: 'revbox',
    script: 'server.js',
    cwd: '/var/www/revbox',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3200,
    },
  }],
};
