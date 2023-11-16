module.exports = {
    apps: [
      {
        name: 'angular-app',
        script: 'npx',
        args: 'ng serve',
        watch: true,
        ignore_watch: ["node_modules", "dist"],
        instances: 1,
        autorestart: true,
        max_restarts: 3,
        min_uptime: 10000,
        env: {
          NODE_ENV: 'production',
          PORT: 4200 // Update port if needed
        },
      },
    ],
  };
  