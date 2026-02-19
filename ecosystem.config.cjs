module.exports = {
  apps: [
    {
      name: "xu-health-site",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/Users/xuguangjun/徐广军个人网站/site",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
    },
  ],
};
