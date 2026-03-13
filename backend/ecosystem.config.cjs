module.exports = {
  apps: [
    {
      name: "localman-api",
      script: "dist/index.js",
      cwd: "/opt/localman/backend",
      env_file: ".env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/localman/error.log",
      out_file: "/var/log/localman/out.log",
      merge_logs: true,
      max_size: "10M",
      retain: 5,
    },
  ],
};
