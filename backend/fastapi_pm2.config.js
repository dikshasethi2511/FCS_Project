module.exports = {
    apps: [
      {
        name: 'fastapi-app',
        script: 'main.py',
        interpreter: 'python',
        interpreter_args: '-u',
        watch: true,
        ignore_watch: ["node_modules", "logs"],
        instances: 1,
        autorestart: true,
        max_restarts: 3,
        min_uptime: 10000,
        env: {
          NODE_ENV: 'production',
          PORT: 5050
        },
      },
    ],
  };
  