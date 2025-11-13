# clientproject

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## JWT 与环境变量

- 接口基址：使用 `process.env.VUE_APP_API_BASE`（默认走 `vue.config.js` 的 `/api` 代理）。
- Token 存储键：`VUE_APP_TOKEN_KEY`（默认 `jwt`），刷新键：`VUE_APP_REFRESH_TOKEN_KEY`（默认 `refresh_token`）。
- 相关文件：
  - `src/config/env.js` 暴露常量供应用使用。
  - `src/utils/auth.js` 统一 token 存取与清理。
  - `src/utils/requests.js` Axios 实例、自动带上 Authorization、401 自动刷新或跳登录。
  - `src/router/index.js` 基于 `meta.requiresAuth` 的路由守卫。

> 开发环境默认通过 `vue.config.js` 将 `/api` 代理到 `http://localhost:8086`，如需直连请设置 `VUE_APP_API_BASE`。
