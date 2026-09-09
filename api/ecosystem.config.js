module.exports = {
  apps: [
    {
      name: 'pms-api',
      script: 'dist/server.js',
      interpreter: 'node',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      out_file: './logs/pm2.out.log',
      error_file: './logs/pm2.err.log',
      merge_logs: true,
      time: true
    }
  ]
};