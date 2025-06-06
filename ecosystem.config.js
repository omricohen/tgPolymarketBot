module.exports = {
  apps: [{
    name: 'tg-polymarket-bot',
    script: 'dist/index.js', // Assuming TypeScript compilation output
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_development: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/pm2/error.log',
    out_file: 'logs/pm2/out.log',
    log_file: 'logs/pm2/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Graceful shutdown
    kill_timeout: 5000,
    // Monitoring
    metrics: {
      http: {
        port: 9209,
        protected: true
      }
    }
  }]
}; 