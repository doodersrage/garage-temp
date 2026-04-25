// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'garage-temp',
      script: 'npm',
      args: 'run preview', // Ensures Astro runs in production mode
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0', // Or 0.0.0.0 for external access
        PORT: 4321
      },
      instances: 1,
      autorestart: true,
      watch: true, // Set to true to restart on file changes
      max_memory_restart: '500M'
    },
  ],
};
