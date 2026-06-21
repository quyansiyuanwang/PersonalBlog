---
title: "Quyan-AppServer 后端 API 接入指南"
date: "2026-06-21"
summary: "我的网站(Quyan-AppServer)后端接口接入指南。"
tags:
  - 后端API安全机制
  - 接入指南 & 安全架构
  - 授权 / 认证
  - JWT / Access Key / Relay Token / OAuth
  - 防重放攻击 / reCAPTCHA / 双因素认证(2FA)
---

# AppServer 后端 API 对接指南

> 本文档面向需要对接本后端 API 的外部开发者，详细说明认证机制、请求签名、防重放保护等安全要求。

## **服务地址：** `https://api.qysyw.cn`

1. [整体安全架构概览](#1-整体安全架构概览)
2. [认证方式选择](#2-认证方式选择)
3. [方式一：JWT 双 Token 机制（用户会话）](#3-方式一jwt-双-token-机制用户会话)
4. [方式二：OAuth 2.0 Bearer Token（第三方应用代用户访问）](#4-方式二oauth-20-bearer-token第三方应用代用户访问)
5. [方式三：Access Key（程序化接入）](#5-方式三access-key程序化接入)
6. [方式四：Relay Token（中继代理）](#6-方式四relay-token中继代理)
7. [防重放攻击签名机制](#7-防重放攻击签名机制)
8. [reCAPTCHA v3 验证](#8-recaptcha-v3-验证)
9. [双因素认证（2FA）与可信设备](#9-双因素认证2fa与可信设备)
10. [请求格式规范](#10-请求格式规范)
11. [响应格式规范](#11-响应格式规范)
12. [错误码参考](#12-错误码参考)
13. [速率限制](#13-速率限制)
14. [IP 黑白名单](#14-ip-黑白名单)
15. [权限系统](#15-权限系统)
16. [完整请求示例](#16-完整请求示例)
17. [对接总结](#17-对接总结)

## 1. 整体安全架构概览

本系统面向 Web 前端、服务端程序集成方以及代理转发场景，采用“**认证 + 鉴权 + 防重放 + 风控校验**”的组合式安全架构。

### 1.1 安全能力总览

| 能力         | 用途                 | 适用场景             |
| ------------ | -------------------- | -------------------- |
| JWT 双 Token | 用户登录会话认证     | Web / App 用户态请求 |
| Access Key   | 程序化身份认证       | 服务端对服务端调用   |
| Relay Token  | 代理层中继调用       | API 网关 / 中转服务  |
| Sign + Nonce | 防重放、验签、防篡改 | 状态变更类敏感接口   |
| reCAPTCHA v3 | 防机器人滥用         | 登录、注册、敏感操作 |
| 速率限制     | 防刷、防爆破         | 全局及单接口保护     |
| IP 黑白名单  | 网络层访问控制       | 管理接口 / 内部接口  |
| 权限系统     | 细粒度授权           | 用户、角色、资源操作 |

### 1.2 安全处理链路

典型请求会按以下顺序经过安全校验：

1. 识别认证方式（JWT / Access Key / Relay Token）
2. 校验身份是否有效、是否过期、是否被禁用
3. 如接口要求防重放，则校验 `X-Nonce`、`X-Timestamp`、`X-Sign` 与 `X-Replay-Session-Id`
4. 如接口涉及高风险表单行为，则校验 `reCAPTCHA Token`
5. 校验权限、速率限制、IP 访问策略
6. 通过后才进入实际业务处理

## 2. 认证方式选择

不同接入方应根据调用主体和运行环境选择合适的认证方式：

| 场景                               | 推荐方式               | 原因                                   |
| ---------------------------------- | ---------------------- | -------------------------------------- |
| 浏览器前端、用户登录后操作         | JWT 双 Token           | 支持登录态、刷新机制、权限联动         |
| 第三方应用代用户访问受限资源       | OAuth 2.0 Bearer Token | 支持应用注册、授权同意、scope 最小授权 |
| 后台任务、服务端脚本、内部系统对接 | Access Key             | 无需用户交互，适合稳定程序调用         |
| 代理转发、统一出口、网关中继       | Relay Token            | 适合上游平台代理或中继场景             |

### 2.1 选择建议

- 如果调用主体是“用户”，优先使用 JWT 双 Token。
- 如果你在做第三方开放平台接入，并且需要“用户授权你的应用访问他的资源”，优先使用 OAuth 2.0 Bearer Token。
- 如果调用主体是“程序”且不方便维护用户登录态，优先使用 Access Key。
- 如果你在构建统一代理层或网关转发层，使用 Relay Token。
- 如果接口文档标注需要防重放签名，则无论使用哪种认证方式，都必须额外实现第 7 节中的签名流程。

## 3. 方式一：JWT 双 Token 机制（用户会话）

### 3.1 登录获取 Token

登录接口为：`POST /auth/login`

该接口的返回不是单一成功结构，而是以下三类分支之一：

1. 直接登录成功，返回 `access_token` 与用户信息
2. 账号已开启 2FA，返回 `requiresTwoFactor=true` 与 `challengeToken`
3. 尚未同意最新政策，返回 `requiresPolicyConsent=true`

**请求：**

```http
POST /auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "your_password",
  "agreedToLegalPolicies": true,
  "recaptchaToken": "03AFcWeA..."
}
```

> 说明：
>
> - `username` 可以是用户名或邮箱，由服务端统一解析。
> - `agreedToLegalPolicies` 在需要时必须为 `true`。
> - `recaptchaToken` 为可选字段，但当服务端启用 reCAPTCHA 且该接口受保护时应传入。

**响应一：直接登录成功**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_xxx",
      "username": "demo",
      "email": "user@example.com"
    },
    "twoFactorReminder": false,
    "oneTimeToken": "optional-short-lived-token"
  }
}
```

**响应二：需要 2FA 验证**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "requiresTwoFactor": true,
    "challengeToken": "2fa_challenge_xxx",
    "expiresIn": 600
  }
}
```

**响应三：需要先同意政策**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "requiresPolicyConsent": true,
    "challengeToken": "policy_consent_challenge_xxx",
    "expiresIn": 600
  }
}
```

> **注意：**
>
> - Refresh Token 会优先通过 `Set-Cookie` 响应头以 HttpOnly Cookie 下发。
> - 返回体中的 `refresh_token` 可能存在，也可能省略；客户端应以 Cookie-first 方式集成。
> - 如果 2FA 已开启且当前设备不在可信窗口内，登录阶段不会直接返回正式会话，而是先返回 2FA challenge。
> - 如果命中政策同意分支，客户端应继续调用 `POST /auth/accept-policy-consent`，并携带 `challengeToken` 与 `agreedToLegalPolicies: true` 完成登录闭环。

### 3.2 携带 Access Token 发起请求

所有需要认证的接口，在请求头中携带：

```http
Authorization: Bearer <accessToken>
```

**示例：**

```http
GET /users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.3 Access Token 过期刷新

Access Token 为短期凭证，客户端应实现自动刷新。刷新接口为：`POST /auth/refresh`。

服务端刷新逻辑为 **Cookie 优先、Body 兜底**：

1. 优先从 HttpOnly Cookie 读取 refresh token
2. 若 Cookie 中不存在，再尝试读取请求体中的 `refresh_token`
3. 刷新成功后返回新的 `access_token`

**请求：**

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> 如果 Refresh Token 存储在 Cookie 中，则无需在请求体中传递，服务端会自动从 Cookie 读取。

**响应：**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> 实际集成建议：
>
> - 浏览器端应带上 `credentials: 'include'`。
> - 若你是非浏览器客户端，且无法接收/发送 Cookie，则需自行安全保存并显式传 `refresh_token`。
> - 前端代码会避免对部分明确业务失败（例如 2FA challenge 过期）进行无意义的 refresh 重试。
> - 刷新成功后服务端可能继续通过 `Set-Cookie` 轮换 refresh cookie，因此客户端不应假设 refresh token 只会在首次登录时下发一次。

### 3.4 政策同意补交流程

当登录或 2FA 验证返回 `requiresPolicyConsent=true` 时，表示密码/二次验证本身已经通过，但用户尚未完成最新服务协议与隐私政策确认。

此时应调用：`POST /auth/accept-policy-consent`

**请求：**

```json
{
  "challengeToken": "policy_consent_challenge_xxx",
  "agreedToLegalPolicies": true
}
```

**说明：**

- 该接口本身也受防重放保护
- `challengeToken` 是短期一次性登录闭环凭证，不应长期缓存
- 完成后服务端才会真正发放正式登录会话

### 3.4.1 逐接口凭证携带边界

这一部分是本轮审计后最需要特别强调的点：**不要把不同端点的凭证携带方式当成“全局统一规则”理解。** 当前实现存在明确的端点边界。

| 凭证/令牌                    | 真实携带方式                    | 适用端点                                                  | 备注                                                |
| ---------------------------- | ------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `access_token`               | `Authorization: Bearer <token>` | 绝大多数 `@Security("jwt")` 接口                          | 当前 TSOA 认证主路径按 Bearer 头读取                |
| `access_token`               | 请求体字段 `access_token`       | `POST /auth/verify`                                       | 该接口是专门的验证接口，不走 Bearer 读取            |
| `refresh_token`              | **HttpOnly Cookie 优先**        | `POST /auth/refresh`、`POST /auth/logout`                 | 请求体里的 `refresh_token` 只是 Cookie 缺失时的兜底 |
| `challengeToken`（2FA）      | 请求体字段                      | `POST /auth/verify-2fa`、`POST /auth/send-2fa-email-code` | 只在登录挑战闭环中有效                              |
| `challengeToken`（政策同意） | 请求体字段                      | `POST /auth/accept-policy-consent`                        | 只用于“认证已通过但政策未确认”的补交流程            |
| `oneTimeToken`               | 请求头 `X-Onetime-Token`        | 已登录后的 step-up 2FA 重试请求                           | 不是登录态，不替代 JWT                              |

补充说明：

- `POST /auth/refresh` 不读取 `Authorization Bearer access_token` 来换发新令牌，它只认 refresh token。
- `POST /auth/logout` 会优先撤销 Cookie 中的 refresh token，并回退读取请求体中的 `refresh_token`；access token 则优先从 Bearer 头解析，也允许请求体传入兜底。
- Passkey 登录流程里，`POST /passkey/auth/verify` 返回 `requiresTwoFactor=true` 时，表示 **Passkey 已通过，但正式登录态尚未发放**；后续仍要走 2FA 或政策同意闭环。

### 3.5 Token 失效场景

以下情况会导致 Token 立即失效，需要重新登录：

| 场景               | 说明                                |
| ------------------ | ----------------------------------- |
| 用户主动登出       | JTI 加入 Redis 黑名单               |
| 用户信息变更       | Token 中的 `updatedAt` 与数据库不符 |
| 账号被禁用/删除    | 账号状态校验失败                    |
| 管理员强制下线     | 用户级别的吊销时间戳更新            |
| Refresh Token 失效 | 无法继续换取新的 `access_token`     |

### 3.6 Token 内部结构（仅供参考）

```json
{
  "userId": "user_id_here",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "status": 1,
  "jti": "unique-token-id",
  "iat": 1716000000,
  "exp": 1716000900
}
```

---

## 4. 方式二：OAuth 2.0 Bearer Token（第三方应用代用户访问）

OAuth 2.0 模式适用于“第三方应用代表用户访问本站资源”的开放平台场景。

当前实现支持：

- Authorization Code
- Refresh Token
- PKCE（`S256`、`plain`）
- 基于 scope 的最小授权

### 4.1 Token 格式与携带方式

OAuth Access Token 为不透明 Bearer Token，当前前缀为：

```
oat_<token内容>
```

请求时统一放在请求头：

```http
Authorization: Bearer oat_xxxxxxxxxxxx
```

说明：

- 该 Token 不是 JWT，客户端不应自行解析其内容。
- 服务端按哈希后的 opaque token 持久化和校验。
- 只有显式声明 OAuth scope 的接口才接受该类 Bearer Token。

### 4.2 OAuth Bearer 与普通 JWT Bearer 的边界

虽然两者都通过 `Authorization: Bearer ...` 传递，但安全语义不同：

| 类型                    | 典型前缀          | 主体               | 权限来源                       |
| ----------------------- | ----------------- | ------------------ | ------------------------------ |
| 普通登录态 Access Token | 通常为 JWT 字符串 | 用户本人会话       | 站内完整登录态 + RBAC          |
| OAuth Access Token      | `oat_`            | 第三方应用代表用户 | 用户授权 scope + 现有站内 RBAC |

当前实现规则：

- OAuth Token 只在控制器方法显式写了 `@Security("jwt", [...scopes])` 时允许访问。
- 如果接口没有声明 scope，即使它本身是 `@Security("jwt")`，OAuth Token 也会被拒绝。
- 通过 OAuth Token 进入接口后，服务端仍会继续校验账号状态、内部权限装饰器、2FA step-up 中间件和业务限流。

### 4.3 已开放的 OAuth Scope 对照表

下表是当前已接入 OAuth Bearer 的 scope 与资源映射。

| Scope          | 典型能力                                                      | 已开放接口                                                                                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile`      | 读取/修改当前用户资料                                         | `GET /users/me`、`PATCH /users/me/profile`                                                                                                                                                                                                                                                                                              |
| `email`        | 发送邮箱变更验证码、修改当前用户邮箱                          | `POST /users/me/send-email-change-code`、`PATCH /users/me/email`                                                                                                                                                                                                                                                                        |
| `notification` | 通知偏好、Webhook、通知日志与事件                             | `GET/PUT /notification/preferences`、`GET/POST/PUT/DELETE /notification/webhooks...`、`POST /notification/email/test`、`GET /notification/logs`、`GET /notification/events`                                                                                                                                                             |
| `oauth_client` | 当前用户自助管理 OAuth 应用                                   | `POST/GET /oauth-clients`、`GET/PUT/DELETE /oauth-clients/{id}`、`POST /oauth-clients/{id}/regenerate-secret`                                                                                                                                                                                                                           |
| `accesskey`    | 仅允许第三方应用代用户创建新的 Access Key，并获取该次新建结果 | `POST /accesskeys`、`POST /accesskeys/send-accesskey-creation-verification-code`                                                                                                                                                                                                                                                        |
| `passkey`      | 当前用户自助管理 Passkey                                      | `POST /passkey/register/options`、`POST /passkey/register/verify`、`GET /passkey/list`、`DELETE /passkey/{credentialId}`                                                                                                                                                                                                                |
| `two_factor`   | 当前用户 2FA 设置与可信设备管理                               | `DELETE /users/me/2fa/trusted-window`、`GET /users/me/2fa/trusted-devices`、`DELETE /users/me/2fa/trusted-devices/{deviceId}`、`GET /users/me/2fa/status`、`POST /users/me/2fa/setup`、`POST /users/me/2fa/confirm`、`POST /users/me/2fa/disable`、`POST /users/me/2fa/recovery-codes/regenerate`、`PATCH /users/me/2fa/passkey-policy` |

### 4.4 Scope 设计建议

第三方应用注册时，建议只申请真实需要的最小 scope：

- 只做账号展示：申请 `profile`
- 要修改邮箱：额外申请 `email`
- 要管理通知回调：申请 `notification`
- 要做安全中心：按需申请 `passkey`、`two_factor`
- 要做开发者中心：按需申请 `oauth_client`、`accesskey`

其中 `accesskey` scope 需要特别注意：

- 第三方应用**不能读取或删除**用户已有的 Access Key；
- 该 scope 仅用于发起“新建 Access Key”流程，并在创建成功时获得那一个新 Key 的明文；
- 一旦创建完成，后续不应再把 OAuth 授权理解为“可重新读取已有 Key”。

不建议默认申请所有 scope。

### 4.5 当前未开放给 OAuth Bearer 的接口类型

以下接口当前不应按“OAuth 开放资源”理解：

- 普通未声明 scope 的 `@Security("jwt")` 接口
- 管理员/全局用户管理接口
- Passkey 登录入口：`POST /passkey/auth/options`、`POST /passkey/auth/verify`
- 其他仅面向站内完整登录态、未完成开放评估的接口

### 4.6 对接建议

- OAuth 客户端应缓存并管理自己的 `access_token` / `refresh_token`。
- 遇到 `403 Insufficient OAuth scope` 时，应引导用户重新发起授权并补充所需 scope。
- 不要把 OAuth Token 当成 Access Key 或 Relay Token 使用。
- 不要假设未来所有 `@Security("jwt")` 接口都会自动开放给 OAuth Bearer；是否开放以文档和 OpenAPI 标注为准。

---

## 5. 方式三：Access Key（程序化接入）

Access Key 适用于服务端程序调用，无需用户登录流程。

### 5.1 Access Key 格式

```
ak_<64位十六进制字符串>
```

示例：`ak_a1b2c3d4e5f6...（共 66 字符）`

### 5.2 使用方式

当前实现中，**Access Key 应按 JWT Bearer 方式携带**：

```http
Authorization: Bearer ak_a1b2c3d4e5f6...
```

审计说明：

- 当前主认证链路会在 Bearer Token 里识别 `ak_` 前缀并按 Access Key 校验。
- 文档层面不建议把 `X-API-Key` 或 `?token=` 当成 Access Key 的通用入口；这两类入口主要用于 Relay Token / 特殊代理场景，而不是当前 TSOA 的标准 JWT 安全方案。

### 5.3 Access Key 的权限

Access Key 继承创建该 Key 的用户的权限。如果用户账号被禁用，对应的 Access Key 也会失效。

### 5.4 获取 Access Key

通过用户账号登录后，在账号设置中创建 Access Key。

当前实现语义更准确地说是：

- 创建动作本身受 JWT 登录态保护；
- 相关高风险接口会触发 step-up 2FA 挑战；
- 删除 Access Key 属于 `alwaysRequire` 场景，即使设备仍在 trusted window 内也会再次要求 2FA；
- “发送 Access Key 创建验证码”接口只是在未启用 2FA 的账户上提供额外校验路径，不应把它理解为所有创建流程的唯一前置条件。

---

## 6. 方式四：Relay Token（中继代理）

Relay Token 用于通过代理层转发请求的场景。

### 6.1 Relay Token 格式

```
rlt_<token内容>
```

### 6.2 使用方式

Relay Token 支持以下三种携带方式：

- `Authorization: Bearer rlt_...`
- `X-API-Key: rlt_...`
- URL 查询参数 `?token=rlt_...`

补充说明：

- 专门声明 `relay-token` 安全方案的接口会按上述三种入口提取 Relay Token；
- 部分走 `jwt` 安全方案的接口，也会在 Bearer Token 中识别 `rlt_` 前缀并转入 Relay Token 校验分支；
- 因此 **Relay Token 的兼容入口明显多于 Access Key**，两者不应混为一谈。

### 6.3 Access Key 与 Relay Token 的区别

这两种凭证都适合程序化调用，但安全语义不同：

| 维度     | Access Key                   | Relay Token                           |
| -------- | ---------------------------- | ------------------------------------- |
| 主体     | 普通程序化调用方             | 中继层 / 网关 / 代理出口              |
| 权限来源 | 继承创建者用户权限           | 面向 Relay 代理能力与额度体系         |
| 典型场景 | 后台脚本、内部系统、定时任务 | OpenAI 兼容代理、统一转发层、网关出口 |
| 风险控制 | 依赖用户态权限与 2FA 管控    | 更强调额度、通道、模型与代理链路控制  |

接入建议：

- 需要“像用户一样”继承权限时，用 `Access Key`
- 需要“像网关一样”统一转发时，用 `Relay Token`
- 不要混用两者的生命周期管理、额度语义与审计方式

---

## 7. 防重放攻击签名机制

部分接口要求携带防重放签名头，但**并不是所有 POST/PUT/PATCH/DELETE 都自动要求防重放**。是否启用，取决于控制器是否显式挂载了对应中间件/装饰器。

如果接口要求签名但未提供，会返回错误；当前实现中，缺失请求头属于参数错误，签名/会话/Nonce/时间戳校验失败则属于鉴权失败。

### 7.1 当前已确认的实际覆盖范围

以下表格比“状态变更类接口通常需要签名”更接近真实实现：

| 接口                                              | 是否要求 Replay 签名 | 备注                                     |
| ------------------------------------------------- | -------------------- | ---------------------------------------- |
| `GET /auth/replay-signing-session`                | 否                   | 它本身就是获取签名材料的入口             |
| `POST /auth/login`                                | 是                   | 登录请求本身受防重放保护                 |
| `POST /auth/refresh`                              | 是                   | Refresh 也要求重新签名                   |
| `POST /auth/verify-2fa`                           | 是                   | 2FA challenge 提交受保护                 |
| `POST /auth/send-2fa-email-code`                  | 是                   | 发码接口同样受保护                       |
| `POST /auth/send-register-verification-code`      | 是                   | 发注册验证码不是“裸接口”                 |
| `POST /auth/send-password-reset-code`             | 是                   | 找回密码发码受保护                       |
| `POST /auth/reset-password`                       | 是                   | 重置密码受保护                           |
| `POST /auth/register`                             | 是                   | 注册受保护                               |
| `POST /auth/accept-policy-consent`                | 是                   | 政策确认闭环也受保护                     |
| `POST /auth/logout`                               | 是                   | 登出也要求签名                           |
| `POST /public/legal-policies/current`             | 否                   | 该接口走 reCAPTCHA，不走 replay          |
| `POST /passkey/auth/options`                      | 否                   | 获取 passkey challenge 本身不要求 replay |
| `POST /passkey/auth/verify`                       | 是                   | 提交 passkey 验证结果受保护              |
| `POST /passkey/register/options`                  | 否                   | 需要 JWT，但不要求 replay                |
| `POST /passkey/register/verify`                   | 是                   | 提交 passkey 注册结果受保护              |
| `GET /users/me/2fa/trusted-devices`               | 否                   | 只做 JWT + 业务限流                      |
| `DELETE /users/me/2fa/trusted-devices/{deviceId}` | 是                   | 删除可信设备受保护                       |

结论：客户端不要按“只要是写操作就统一加签、只要是读操作就一定不用加签”的粗粒度规则实现，而应以具体接口要求为准。

### 7.2 机制原理

防重放签名机制的核心目标，是确保**请求未被篡改**、**请求只能使用一次**、**请求发生在允许的时间窗口内**。整体原理如下图所示：

```mermaid
sequenceDiagram
  participant I as Integrator
  participant C as Client
  participant S as Server
  I->>C: 选择接入方式
  alt 用户态接入
    C->>S: 使用 JWT Access Token 发起请求
  else 程序化接入
    C->>S: 使用 Access Key 发起请求
  else 代理中继接入
    C->>S: 使用 Relay Token 发起请求
  end
  opt 接口要求防重放签名
    C->>S: 先申请 signing session
    S-->>C: 返回 sessionId signingKey expiresAt
    C->>C: 生成 nonce timestamp sign
  end
  opt 接口要求人机验证
    C->>C: 获取 reCAPTCHA token
  end
  C->>S: 发起正式 API 请求
  S->>S: 执行认证 权限 限流 IP 与风控校验
  S-->>C: 返回业务响应
```

这条链路可以拆解为 5 个关键动作：

1. 客户端先获取短期有效的签名会话（`sessionId` + `signingKey`）
2. 每次请求生成全新的 `nonce`
3. 记录当前 `timestamp`，确保请求只在有限时间窗内有效
4. 使用 `signingKey` 对 `nonce + timestamp + path + body` 做 HMAC-SHA256 签名
5. 服务端同时校验会话、时间戳、Nonce 唯一性和签名正确性，通过后才进入业务处理

### 7.3 第一步：获取签名会话

```http
GET /auth/replay-signing-session
Cookie: <可选登录态 Cookie>
X-Client-Fingerprint: browser.chrome.win11.1920x1080
```

**响应：**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "sessionId": "0a7b8d2e-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "signingKey": "6cf5b0f7b5d4...",
    "algorithm": "HMAC-SHA256",
    "expiresIn": 600,
    "expiresAt": "2025-01-01T00:10:00.000Z"
  }
}
```

> 签名会话有效期默认为 **600 秒**。前端实现会在本地缓存该材料，并在剩余有效期不足时主动刷新。

关键实现细节：

- 这是 `GET` 接口，不需要请求体。
- 客户端指纹通过 `X-Client-Fingerprint` 头传递，而不是请求体字段。
- 服务端会把签名会话与客户端指纹绑定；后续业务请求若指纹不一致，会判定为签名会话校验失败。
- `signingKey` 直接作为 HMAC key 使用，当前实现是十六进制字符串，不需要再做 Base64 解码。
- 签名会话默认有效期约为 **600 秒**；Nonce 占用窗口也为 **600 秒**，两者生命周期保持一致。

### 7.4 第二步：计算签名

**签名算法：HMAC-SHA256**

**签名内容（按顺序拼接，无分隔符）：**

```
nonce + timestamp + path + body
```

| 字段         | 说明                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `nonce`      | 随机唯一字符串（推荐 UUID，每次请求不同）                             |
| `timestamp`  | Unix 时间戳（秒），与服务端时差不超过 ±5 分钟                         |
| `path`       | 请求路径，应与服务端实际看到的 `req.path` 一致，例如 `/users/profile` |
| `body`       | 请求体的原始字符串（无请求体时为空字符串 `""`）                       |
| `signingKey` | 从签名会话获取的密钥，直接作为 HMAC key 使用                          |

**伪代码示例：**

```javascript
const nonce = crypto.randomUUID();
const timestamp = Math.floor(Date.now() / 1000).toString();
const path = "/users/create";
const body = JSON.stringify({ name: "test" });

const message = nonce + timestamp + path + body;

const sign = crypto
  .createHmac("sha256", signingKey)
  .update(message)
  .digest("hex");
```

**Python 示例：**

```python
import hmac
import hashlib
import uuid
import time

nonce = str(uuid.uuid4())
timestamp = str(int(time.time()))
path = "/users/create"
body = '{"name": "test"}'

message = (nonce + timestamp + path + body).encode("utf-8")

sign = hmac.new(signing_key.encode("utf-8"), message, hashlib.sha256).hexdigest()
```

### 7.5 第三步：携带签名头发起请求

在业务请求中添加以下四个请求头：

```http
X-Nonce: <随机唯一字符串，每次请求不同>
X-Timestamp: <Unix 时间戳（秒）>
X-Sign: <HMAC-SHA256 签名（十六进制）>
X-Replay-Session-Id: <签名会话 ID>
```

**可选头（增强安全性）：**

```http
X-Client-Fingerprint: <客户端指纹>
```

客户端指纹格式：16-256 位字母数字字符，可含 `.`、`:`、`_`、`-`。

**完整请求示例：**

```http
POST /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Nonce: 550e8400-e29b-41d4-a716-446655440000
X-Timestamp: 1716000000
X-Sign: a3f5c8d2e1b4...（64位十六进制）
X-Replay-Session-Id: sess_xxxxxxxx
X-Client-Fingerprint: browser.chrome.win11.1920x1080

{
  "name": "New User",
  "email": "newuser@example.com"
}
```

### 7.6 签名验证失败的处理

签名验证失败时，服务端会返回业务错误码。客户端应：

1. 检查本地时钟是否与服务端偏差超过 5 分钟
2. 检查签名会话是否已过期，必要时重新获取
3. 确认 `X-Client-Fingerprint` 与申请会话时保持一致
4. 确认 Nonce 未被重复使用（每次请求必须生成新 Nonce）
5. 如果是前端自动重试请求，确保重新生成 `X-Nonce`、`X-Timestamp`、`X-Sign`，不要复用上一轮签名头

常见失败类型：

| 场景                                                              | 典型结果                  |
| ----------------------------------------------------------------- | ------------------------- |
| 缺少 `X-Nonce` / `X-Timestamp` / `X-Sign` / `X-Replay-Session-Id` | 参数错误，拒绝进入业务层  |
| 时间戳超出 ±5 分钟                                                | 防重放校验失败            |
| 签名会话不存在、损坏或过期                                        | 防重放校验失败            |
| 指纹与会话绑定值不一致                                            | 防重放校验失败            |
| 签名不匹配                                                        | 防重放校验失败            |
| Nonce 重复使用                                                    | 防重放校验失败            |
| Redis 不可用导致无法验证会话或占用 Nonce                          | **fail-closed**，直接拒绝 |

下图展示了服务端在签名校验阶段的完整判定路径，包括各类失败分支：

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: 请求 signing session
  S-->>C: 返回 sessionId signingKey
  C->>C: 生成 nonce timestamp 与 sign
  C->>S: 发送带签名的敏感请求
  S->>S: 校验 sessionId
  alt session 无效或过期
    S-->>C: 401 会话失效
  else session 有效
    S->>S: 校验 timestamp
    alt 超出时间窗口
      S-->>C: 401 时间戳无效
    else 时间有效
      S->>S: 原子标记 nonce
      alt nonce 已使用
        S-->>C: 401 Nonce 已使用
      else nonce 首次使用
        S->>S: 计算并比对 sign
        alt sign 不匹配
          S-->>C: 401 Sign 不匹配
        else sign 匹配
          S->>S: 在事务内执行业务处理
          S-->>C: 200 业务成功
        end
      end
    end
  end
```

### 7.7 签名（Sign）详解

签名（Sign）是用来验证请求完整性与请求发起者持有签名密钥的证明。签名以 HMAC-SHA256 为例，使用从签名会话（Signing Session）获取的 `signingKey` 直接进行计算。

主要关注点：

- 签名密钥的生命周期：由 `/auth/replay-signing-session` 创建，会在 `expiresAt` 过期。
- 签名范围（scope）：签名应绑定到请求路径与请求体，不应包含客户端或服务端的可变元数据（如请求时间或随机数）以外的内容，防止签名在不同请求之间复用。
- 签名校验应为原子操作：在验证签名后再去读取/变更业务资源，避免竞态导致的重放或重复提交问题。

签名计算（当前实现规范）：

- 输入顺序固定为：`nonce + timestamp + path + body`
- `signing_session_id` 不参与签名，只用于服务端查找 `signingKey`
- 服务端按 `req.path` 参与签名，因此客户端应使用后端路由路径本身，不要混入域名与协议
- Nonce 通过 Redis 原子占用，避免并发重复提交
- 当前实现是**先校验签名，再原子占用 Nonce**；无论哪一步失败，请求都不会进入业务层

服务器端签名验证步骤（贴近当前实现）：

1. 从 `X-Replay-Session-Id` 找到 `signingKey`（如果找不到，返回防重放失败）。
2. 校验客户端指纹是否与签名会话绑定值一致。
3. 校验 `timestamp` 是否在 ±5 分钟窗口内。
4. 按与客户端相同顺序拼接待签名字符串并计算 HMAC-SHA256。
5. 校验 `X-Sign` 是否与预期签名一致。
6. 原子占用 `nonce`；若已用则直接失败。
7. 通过后才继续业务处理。

安全建议：

- 不要在签名中包含可被攻击者控制的可变字段（例如 HTTP 头里传入的任意参数），只使用受控输入。
- 签名密钥不得在客户端暴露：签名密钥仅应由受保护的后端或短期会话传给受信的前端环境。

### 7.8 Nonce（随机数）详解

Nonce 的职责是保证同一签名或同一请求内容无法被重复提交（防止重放）。Nonce 本身不是签名，也不包含密钥信息；它是签名输入的一部分，并需要被服务端原子性地记录与验证。

主要关注点：

- 唯一性：每次业务请求必须使用新的 Nonce（推荐 UUIDv4）。
- 原子标记：服务器在验证签名后必须原子地将该 `nonce` 标记为已使用（例如 Redis SETNX + TTL 或数据库唯一索引）。
- 存储时长：Nonce 的保存时间应与签名会话 TTL 相匹配或稍长（典型 10 分钟到 24 小时），以容忍网络延迟。

服务器端 Nonce 驱动的实现语义（Redis 示例）：

1. 计算 `nonce_key = "replay:nonce:" + sessionId + ":" + nonce`。
2. 在签名已经通过后，使用 `SET nonce_key 1 NX EX <nonce_ttl_seconds>` 原子占用。
3. 若写入失败（键已存在），说明该请求已被使用，直接拒绝。
4. 如果写入成功，才继续业务处理。

注意：当前实现要求 Redis 正常可用；若 Redis 不可用，不会降级为“放行”，而是直接拒绝请求。

### Nonce 与签名结合的典型顺序（简图）

下图展示了客户端获取签名会话、生成 Nonce 与时间戳、服务端原子校验 Nonce 并完成签名验证的典型顺序：

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: 请求 signing session
  S-->>C: 返回 sessionId signingKey expiresAt
  C->>C: 生成 nonce timestamp sign
  C->>S: 发送带签名的业务请求
  S->>S: 原子标记 nonce
  alt nonce 首次使用
    S->>S: 校验 timestamp 是否在允许窗口内
    alt 时间戳无效
      S-->>C: 401 时间戳无效
    else 时间戳有效
      S->>S: 计算并比对 sign
      alt sign 匹配
        S-->>C: 返回业务响应
      else sign 不匹配
        S-->>C: 401 Sign 不匹配
      end
    end
  else nonce 已被使用
    S-->>C: 401 Nonce 已使用
  end
```

### 7.9 签名会话与请求生命周期详图

下面给出两个高层流程图，便于理解会话生命周期与单次请求的各阶段：

整体会话生命周期如下图所示：

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: 请求 signing session
  S-->>C: 返回 sessionId signingKey expiresAt
  note right of C: 缓存 signing session（TTL 10 分钟）
  loop 多次业务请求
    C->>C: 生成 nonce timestamp sign
    C->>S: 发起带签名的业务请求
    S->>S: 校验 sessionId timestamp nonce sign
    S-->>C: 返回业务响应
  end
  alt 会话过期
    C->>S: 重新请求 signing session
    S-->>C: 返回新的 sessionId signingKey expiresAt
  end
```

单次请求内部校验顺序如下图所示：

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: 发送请求（X-Nonce X-Timestamp X-Sign X-Replay-Session-Id）
  S->>S: 查找 sessionId 并获取 signingKey
  S->>S: 校验 timestamp 是否在允许窗口内
  alt 时间戳无效
    S-->>C: 401 时间戳无效
  else 时间戳有效
    S->>S: 原子标记 nonce
    alt nonce 首次使用
      S->>S: 计算 HMAC(signingKey, nonce+timestamp+path+body)
      S->>S: 比对 X-Sign
      alt sign 匹配
        S->>S: 在事务内执行业务处理
        S-->>C: 200 业务成功
      else sign 不匹配
        S-->>C: 401 Sign 不匹配
      end
    else nonce 已被使用
      S-->>C: 401 Nonce 已使用
    end
  end
```

以上流程图强调：Nonce 的写入（SETNX）和签名校验需要整体上被视作请求处理的一部分，且应尽量在同一原子单元/事务中完成，以避免重放/并发问题。

---

## 7. reCAPTCHA v3 验证

生产环境已启用 Google reCAPTCHA v3（最低分数阈值 `0.5`），但它同样是**按端点启用**，不是对所有认证接口统一生效。

整体处理流程如下图所示：

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant S as Server
  participant G as Google reCAPTCHA
  U->>B: 打开登录或注册页面
  B->>G: grecaptcha.execute(action)
  G-->>B: 返回 recaptcha token
  B->>S: 提交业务请求 + recaptchaToken
  S->>G: 校验 token score action
  alt token 无效
    G-->>S: invalid
    S-->>B: 400 验证失败
  else token 有效但 score/action 不满足要求
    G-->>S: valid but risky
    S-->>B: 拒绝请求或进入风控
  else 校验通过
    G-->>S: valid and trusted
    S-->>B: 继续认证或业务处理
  end
```

### 7.1 当前已确认的实际覆盖范围

本轮审计已确认以下端点会在“服务端启用 reCAPTCHA 配置”时校验 `recaptchaToken`：

| 接口                                         | action                     |
| -------------------------------------------- | -------------------------- |
| `POST /auth/login`                           | `login`                    |
| `POST /auth/send-2fa-email-code`             | `send_2fa_email_code`      |
| `POST /auth/send-register-verification-code` | `send_verification_code`   |
| `POST /auth/send-password-reset-code`        | `send_password_reset_code` |
| `POST /auth/reset-password`                  | `reset_password`           |
| `POST /auth/register`                        | `register`                 |
| `POST /public/legal-policies/current`        | `view_policy`              |
| `POST /users/me/send-email-change-code`      | `change_email`             |

反过来说，像 `POST /auth/refresh`、`POST /auth/verify-2fa`、`POST /auth/logout` 这类接口并不直接校验 reCAPTCHA。

### 7.2 获取 Token

在前端页面中使用 reCAPTCHA v3 SDK 获取 Token：

```javascript
// 浏览器端
const token = await grecaptcha.execute("YOUR_SITE_KEY", { action: "login" });
```

服务端程序（无浏览器环境）无法直接获取 reCAPTCHA Token。如需从服务端调用这类接口，需联系管理员申请豁免或使用 Access Key 绕过人机验证。

### 7.3 携带方式

在请求体中添加 `recaptchaToken` 字段：

```json
{
  "username": "user@example.com",
  "password": "your_password",
  "agreedToLegalPolicies": true,
  "recaptchaToken": "03AGdBq25..."
}
```

### 7.4 验证失败响应

```json
{
  "code": 400,
  "message": "reCAPTCHA verification failed",
  "data": null
}
```

---

## 8. 双因素认证（2FA）与可信设备

本项目的 2FA 不是附属能力，而是完整纳入登录、敏感配置、Access Key 管理和高风险写操作中的主安全链路。

### 8.1 支持的安全能力

当前实现至少包含以下能力：

| 能力              | 说明                                                |
| ----------------- | --------------------------------------------------- |
| TOTP 动态码       | 用户完成 2FA 绑定后使用验证码登录/验证              |
| 邮件验证码        | 登录 challenge 阶段可发送邮件验证码                 |
| 恢复码            | 当用户无法提供动态码时可作为兜底验证方式            |
| 可信设备          | 通过 Cookie + 指纹 + IP/User-Agent 组合建立可信窗口 |
| 一次性令牌        | 针对高风险 `alwaysRequire` 接口提供单次重试放行     |
| Step-up Challenge | 已登录用户访问高风险接口时再次触发 2FA              |
| Passkey 策略联动  | 可配置 passkey 登录时是否仍要求 2FA                 |

### 8.2 登录阶段的 2FA 决策流程

密码校验通过后，服务端不会无条件直接发放会话，而是按下列规则决策：

1. 若用户未启用 2FA：直接登录成功
2. 若用户已启用 2FA 且当前设备仍在可信窗口内：直接登录成功
3. 若用户已启用 2FA 且当前设备不可信：返回 `requiresTwoFactor=true`
4. 客户端持 `challengeToken` 进入二次验证流程

下图展示了完整登录 challenge 生命周期：

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant A as Auth API
  participant T as TwoFactor Service
  U->>C: 提交 username password agreedToLegalPolicies
  opt 风控启用
    C->>C: 获取 recaptchaToken
  end
  C->>A: POST /auth/login
  A->>A: 校验账号密码与政策同意状态
  alt 凭证错误或账号不可用
    A-->>C: 401/403 登录失败
  else 需要先同意政策
    A-->>C: data.requiresPolicyConsent = true
  else 2FA 未开启
    A-->>A: 直接签发 access_token refresh cookie
    A-->>C: 登录成功
  else 2FA 已开启
    A->>T: 检查 trusted window / trusted device
    alt 当前设备可信
      A-->>C: 直接登录成功
    else 当前设备不可信
      T-->>A: 返回 challengeToken expiresIn
      A-->>C: data.requiresTwoFactor = true
      U->>C: 输入 code / emailCode / recoveryCode
      C->>A: POST /auth/verify-2fa
      A->>T: 校验 challenge 与验证码
      alt challenge 过期或验证码无效
        A-->>C: 1019 或 1020
      else 验证成功
        A->>T: 建立 trusted device / trusted window
        A->>T: 生成 oneTimeToken(短时)
        A-->>C: 返回 access_token 与 oneTimeToken
      end
    end
  end
```

### 8.3 完成登录挑战：`POST /auth/verify-2fa`

当登录接口返回 `requiresTwoFactor=true` 时，客户端应调用：`POST /auth/verify-2fa`

**请求体：**

```json
{
  "challengeToken": "2fa_challenge_xxx",
  "code": "123456"
}
```

也可以使用其他验证方式：

```json
{
  "challengeToken": "2fa_challenge_xxx",
  "emailCode": "482193"
}
```

或：

```json
{
  "challengeToken": "2fa_challenge_xxx",
  "recoveryCode": "ABCD-EFGH-IJKL"
}
```

**成功响应：**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "optional",
    "user": {
      "id": "user_xxx"
    },
    "oneTimeToken": "short-lived-stepup-token"
  }
}
```

实现语义：

- 登录 challenge 验证成功后，服务端会完成正式登录
- 同时可能建立可信设备窗口
- 并返回一个 **短时一次性令牌** `oneTimeToken`，供后续某些高风险重试场景使用

### 8.4 发送登录邮件验证码：`POST /auth/send-2fa-email-code`

如客户端希望改用邮件验证码，可调用：

```json
{
  "challengeToken": "2fa_challenge_xxx",
  "recaptchaToken": "03AFcWeA..."
}
```

该接口主要用于登录 challenge 场景下，服务端向用户邮箱发送一次性验证码。它本身也受速率限制保护。

### 8.5 可信设备与 trusted window

可信设备不是“永久免验证”，而是一个带过期时间的信任窗口。服务端会综合以下信息判断当前请求是否仍在可信窗口中：

- 可信设备 Cookie：`two_factor_trusted_device`
- 客户端指纹
- IP 地址
- User-Agent
- 用户维度的 trusted window 记录

下图展示可信设备建立、命中、删除和过期的生命周期：

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant A as Auth API
  participant T as TwoFactor Service
  participant R as Redis/Store
  U->>C: 在新设备完成 2FA 登录
  C->>A: POST /auth/verify-2fa
  A->>T: 验证 challenge
  T->>R: 保存 trusted window 记录
  T->>A: 生成 trusted device cookie
  A-->>C: Set-Cookie(two_factor_trusted_device)
  loop 后续敏感请求或再次登录
    C->>A: 携带 JWT / trusted device cookie / fingerprint
    A->>T: 校验 IP User-Agent fingerprint cookie
    alt 在 trusted window 内
      T-->>A: trusted = true
      A-->>C: 跳过普通 2FA challenge
    else 已过期或不匹配
      T-->>A: trusted = false
      A-->>C: 需要重新完成 2FA
    end
  end
  opt 用户查看设备列表
    C->>A: GET /users/me/2fa/trusted-devices
    A-->>C: 返回 devices total pageSize
  end
  opt 用户删除设备
    C->>A: DELETE /users/me/2fa/trusted-devices/{deviceId}
    A->>T: 删除指定 trusted device
    alt 删除的是当前设备
      A-->>C: 清理当前 trusted cookie
    else 删除其他设备
      A-->>C: 返回 removed=true/false
    end
  end
```

部署与安全要求：

- `TWO_FACTOR_TRUSTED_DEVICE_SECRET` 必须配置，且长度至少 64 字符
- 它必须与 `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、`REPLAY_SIGNING_MASTER_SECRET` 相互隔离
- 可信设备 Cookie 的 `SameSite` 与 `Domain` 由环境变量控制
- `Secure` 标记会根据生产环境或 `SameSite=None` 等条件启用

### 8.6 用户侧 2FA 管理接口

以下接口用于当前用户管理自己的 2FA 能力：

| 接口                                              | 说明                                          |
| ------------------------------------------------- | --------------------------------------------- |
| `GET /users/me/2fa/status`                        | 获取 2FA 状态、passkey 策略与可信设备分页能力 |
| `POST /users/me/2fa/setup`                        | 开始绑定 2FA，返回二维码与 `setupToken`       |
| `POST /users/me/2fa/confirm`                      | 输入动态码确认绑定并启用 2FA                  |
| `POST /users/me/2fa/disable`                      | 使用动态码或恢复码关闭 2FA                    |
| `POST /users/me/2fa/recovery-codes/regenerate`    | 校验后重新生成恢复码                          |
| `PATCH /users/me/2fa/passkey-policy`              | 设置 passkey 登录是否仍需 2FA                 |
| `GET /users/me/2fa/trusted-devices`               | 分页查看当前可信设备                          |
| `DELETE /users/me/2fa/trusted-devices/{deviceId}` | 删除指定可信设备                              |
| `DELETE /users/me/2fa/trusted-window`             | 清除当前 trusted window（仅开发环境调试）     |

**开始绑定 2FA 响应示例：**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "setupToken": "2fa_setup_xxx",
    "qrCodeDataUrl": "data:image/png;base64,...",
    "otpauthUrl": "otpauth://totp/...",
    "secret": "BASE32SECRET",
    "expiresIn": 600
  }
}
```

**确认绑定响应示例：**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "enabled": true,
    "passkeyRequired": true,
    "recoveryCodes": ["ABCD-EFGH-IJKL", "MNOP-QRST-UVWX"]
  }
}
```

### 8.7 高风险接口的 Step-up 2FA

用户即使已经登录，在访问高风险接口时，仍可能再次被要求完成 2FA。这类能力由后端统一通过 `TwoFactorChallengeProtected(...)` 装饰器声明。

当前已确认的典型覆盖范围包括：

- Access Key 创建
- Access Key 删除（`alwaysRequire=true`）
- Access Key 创建前的邮箱验证码发送
- 当前用户发送邮箱变更验证码
- 当前用户修改邮箱
- 当前用户修改密码

不要把它理解成“所有高风险接口都必然统一挂了 step-up 2FA”；真实覆盖仍以具体控制器声明为准。

该机制分两种模式：

1. **普通 step-up**：若设备仍在可信窗口，可直接放行
2. **alwaysRequire**：即使设备可信，也必须再次完成 2FA；验证成功后只给一次短时重试机会

更贴近运行时的细节如下：

- 中间件会先检查当前请求是否已带 `X-Onetime-Token`，若该一次性令牌有效，则本次请求可直接放行；
- 该一次性令牌用于“已完成 2FA 之后的原请求重试”，不是长期可信状态；
- 对普通 step-up 接口，只要 trusted window 命中，就无需再次挑战；
- 对 `alwaysRequire` 接口，即使 trusted window 命中，也仍会下发新的 2FA challenge；
- 当前挑战中间件对 `X-Onetime-Token` 的校验是“验证后放行”，不应由客户端假设它可以长期重复消费。

下图展示 step-up challenge 的运行方式：

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant B as Business API
  participant M as 2FA Challenge Middleware
  participant T as TwoFactor Service
  U->>C: 点击高风险操作
  C->>B: 发起已登录请求(JWT + 可选重放签名)
  B->>M: 进入 TwoFactorChallengeProtected 校验
  M->>T: 检查 2FA 是否启用
  alt 未启用 2FA
    M-->>B: 直接放行
    B-->>C: 业务成功
  else 已启用 2FA
    M->>T: 校验 X-Onetime-Token
    alt oneTimeToken 有效
      M-->>B: 单次放行
      B-->>C: 业务成功
    else 无 oneTimeToken
      M->>T: 校验 trusted window
      alt 普通 step-up 且 trusted=true
        M-->>B: 放行
        B-->>C: 业务成功
      else 需要再次验证
        T-->>M: challengeToken expiresIn
        M-->>C: 1018 TWO_FACTOR_REQUIRED
        U->>C: 完成 2FA 验证
        C->>C: 暂存原请求
        C->>B: 通过认证接口完成 verify-2fa
        B-->>C: 返回 oneTimeToken
        C->>C: 重新生成 nonce timestamp sign
        C->>B: 重放原始请求 + X-Onetime-Token
        B->>M: 再次经过中间件
        M-->>B: 单次放行
        B-->>C: 高风险操作成功
      end
    end
  end
```

### 8.8 一次性令牌与重试机制

当接口触发 step-up challenge 后，服务端会返回 2FA challenge 信息。前端完成验证后：

1. 把待执行请求暂存
2. 完成 `verify-2fa`
3. 从响应中读取 `oneTimeToken`
4. 重发原始请求，并附带 `X-Onetime-Token`
5. 若原接口还要求防重放，则重新生成新的签名头后再重试

这意味着：

- `X-Onetime-Token` 是对单次高风险重试的放行凭证
- 它不是长期会话，也不替代 JWT
- 前端重试完成后应立即清除，不应复用
- 某些 `alwaysRequire` 场景下，即使设备已在 trusted window 内，也仍必须完成这一步

下面这张图专门展示前端在 `request.ts` 内部对 `challengeToken`、`oneTimeToken` 与重放签名重试的处理顺序：

```mermaid
sequenceDiagram
  participant U as User
  participant V as Vue Page
  participant R as request.ts
  participant S as ReplaySigningService
  participant A as Auth API
  participant B as Business API

  U->>V: 点击高风险操作
  V->>R: 发起业务请求
  opt 接口命中防重放名单
    R->>S: ensureSigningMaterial()
    S->>A: GET /auth/replay-signing-session
    A-->>S: sessionId + signingKey + expiresAt
    S-->>R: 返回签名材料
    R->>R: 生成 X-Nonce / X-Timestamp / X-Sign / X-Replay-Session-Id
  end
  R->>B: 发送 JWT + 可选重放头
  B-->>R: 1018 TWO_FACTOR_REQUIRED + challengeToken
  R->>R: 暂存原始请求到 pendingTwoFactorRequests
  R-->>V: 触发 2FA 弹窗/流程

  U->>V: 输入 code / emailCode / recoveryCode
  V->>A: POST /auth/verify-2fa
  A-->>V: access_token + optional refresh_token + oneTimeToken
  V->>R: retryPendingTwoFactorRequests()
  R->>R: 取出 sessionStorage.oneTimeToken

  loop 对每个待重试请求
    alt 原请求含重放头
      R->>S: ensureSigningMaterial()
      alt 会话仍可用
        S-->>R: 复用现有签名材料
      else 会话过期或不存在
        S->>A: GET /auth/replay-signing-session
        A-->>S: 新 sessionId + signingKey + expiresAt
        S-->>R: 新签名材料
      end
      R->>R: 删除旧 X-Nonce / X-Timestamp / X-Sign / X-Replay-Session-Id
      R->>R: 按原 path + body 重新生成重放头
    end
    R->>R: 注入 X-Onetime-Token
    R->>B: 重试原请求
    alt oneTimeToken + 重放校验通过
      B-->>R: 业务成功
      R-->>V: 更新页面状态
    else 重试仍失败
      B-->>R: 错误响应
      R-->>V: 交由统一错误处理
    end
  end

  R->>R: 清理 oneTimeToken
```

如果需要从实现角度理解 `frontend/src/stores/request.ts` 的内部转移关系，建议拆成“主请求链路”和“2FA 重试链路”两张图分别看：

**主请求链路：**

```mermaid
stateDiagram-v2
  [*] --> BuildRequest

  BuildRequest: 解析 endpoint / path / body
  BuildRequest --> PrepareHeaders

  PrepareHeaders: 注入基础 headers
  PrepareHeaders --> EnsureReplay: 命中 replay 接口
  PrepareHeaders --> RouteRequest: 普通接口

  EnsureReplay: ensureSigningMaterial()
  EnsureReplay --> RouteRequest: 签名材料可用
  EnsureReplay --> TerminalError: 获取签名材料失败

  RouteRequest --> DirectFetch: directRequest=true
  RouteRequest --> ResolveToken: axios 链路

  ResolveToken --> UseToken: 存在 pending 2FA
  ResolveToken --> RefreshToken: token 即将过期 / 正在刷新
  ResolveToken --> UseToken: token 可直接使用

  RefreshToken: 等待 refreshTokenPromise
  RefreshToken --> UseToken: 刷新成功或已结束

  UseToken --> DispatchRequest
  DirectFetch --> Success: fetch 成功
  DirectFetch --> TerminalError: fetch 失败

  DispatchRequest --> Success: code == OK
  DispatchRequest --> QueueTwoFactor: code == TWO_FACTOR_REQUIRED
  DispatchRequest --> RecoverReplay: replay 会话可恢复失败
  DispatchRequest --> RetryUnauthorized: 401 且允许刷新重试
  DispatchRequest --> TerminalError: 其他业务 / HTTP 错误

  RecoverReplay: clear + refresh signing material
  RecoverReplay --> DispatchRequest: 自动重试一次
  RecoverReplay --> TerminalError: 恢复失败

  RetryUnauthorized: getRefreshPromise()
  RetryUnauthorized --> DispatchRequest: 刷新成功并重试
  RetryUnauthorized --> TerminalError: 刷新失败

  Success --> [*]
  TerminalError --> [*]
```

**2FA 重试链路：**

**2FA 重试准备阶段：**

```mermaid
stateDiagram-v2
  [*] --> QueueTwoFactor

  QueueTwoFactor: savePendingTwoFactorRequest()
  QueueTwoFactor --> WaitingForTwoFactor

  WaitingForTwoFactor --> RetryPendingQueue: verify-2fa 成功
  WaitingForTwoFactor --> TerminalError: 用户取消 / 二次验证失败

  RetryPendingQueue: retryPendingTwoFactorRequests()
  RetryPendingQueue --> RefreshBeforeBatchRetry: access token 已过期
  RetryPendingQueue --> RebuildRetryRequest: token 仍可用

  RefreshBeforeBatchRetry: 先刷新 access token
  RefreshBeforeBatchRetry --> RebuildRetryRequest

  TerminalError --> [*]
```

**2FA 重试执行阶段：**

```mermaid
stateDiagram-v2
  [*] --> RebuildRetryRequest

  RebuildRetryRequest: 清理旧 Authorization
  RebuildRetryRequest --> RebuildReplayHeaders: 原请求含重放头
  RebuildRetryRequest --> AttachOneTimeToken: 原请求无重放头

  RebuildReplayHeaders: 重新生成 nonce / timestamp / sign / sessionId
  RebuildReplayHeaders --> AttachOneTimeToken

  AttachOneTimeToken: 注入 X-Onetime-Token
  AttachOneTimeToken --> DispatchRequest

  DispatchRequest --> Success: 重试成功
  DispatchRequest --> TerminalError: 重试失败

  Success --> ClearOneTimeToken: 2FA 重试批次结束
  ClearOneTimeToken: sessionStorage.removeItem('oneTimeToken')
  ClearOneTimeToken --> [*]
  TerminalError --> [*]
```

### 8.9 恢复码、邮件验证码与 passkey 策略说明

- **恢复码**：用于用户临时无法提供动态码时的兜底校验；重新生成后旧恢复码应视为失效
- **邮件验证码**：更适合登录 challenge 的辅助校验，不宜作为无节制替代方式
- **passkey 策略**：`passkeyRequired=true` 表示即使通过 passkey 登录，仍可能继续进入 2FA challenge；可通过 `PATCH /users/me/2fa/passkey-policy` 调整
- **passkey challenge 时效**：当前实现中，passkey 登录相关 challenge 默认存储在 Redis 中，TTL 约为 **300 秒**，前端应在短时间内完成验证闭环
- **policy consent 仍可能在认证成功后打断发放会话**：密码登录成功、2FA 登录成功、Passkey 验证成功，都不代表一定已经拿到最终登录态；如果系统检测到用户尚未同意当前生效政策，仍会先返回 `requiresPolicyConsent=true`

---

## 9. 请求格式规范

### 9.1 通用请求头

| 请求头                 | 必填             | 说明                      |
| ---------------------- | ---------------- | ------------------------- |
| `Content-Type`         | 是（有请求体时） | `application/json`        |
| `Authorization`        | 是（认证接口）   | `Bearer <token>`          |
| `X-Nonce`              | 条件必填         | 防重放接口必须            |
| `X-Timestamp`          | 条件必填         | 防重放接口必须            |
| `X-Sign`               | 条件必填         | 防重放接口必须            |
| `X-Replay-Session-Id`  | 条件必填         | 防重放接口必须            |
| `X-Client-Fingerprint` | 可选             | 增强安全性                |
| `X-Onetime-Token`      | 条件必填         | 高风险 step-up 重试时使用 |

### 9.2 请求体大小限制

| 类型                                       | 限制                                |
| ------------------------------------------ | ----------------------------------- |
| `application/json`                         | 受服务端 JSON body limit 限制       |
| `application/x-www-form-urlencoded`        | 受服务端 urlencoded body limit 限制 |
| 其他常规请求体                             | 受全局请求体限制约束                |
| 文件上传（multipart，部分 Relay/资源接口） | 受专门 multipart limit 限制         |

> 说明：这些限制由服务端环境配置控制，不应假设所有部署环境完全一致。上传型或大请求接入前应先与服务端确认当前限额。

### 9.3 Cookie 与跨域要求

如果你使用浏览器登录态集成：

- 前端请求必须启用 `credentials: 'include'` 或等价配置
- 后端已启用允许携带凭证的 CORS 配置
- refresh token 以 HttpOnly Cookie 为主，不应尝试通过前端脚本读取
- refresh cookie 的 `SameSite`、`Domain`、`Secure` 由环境配置决定

部署注意：

- 生产环境下通常会启用 `Secure`
- 当 `SameSite=None` 时也会要求 `Secure`
- 反向代理/负载均衡场景下，服务端已启用 `trust proxy`，以便正确识别来源 IP 与协议链路

---

## 10. 响应格式规范

所有接口统一返回以下格式：

```json
{
  "code": 0,
  "message": "Success",
  "data": { ... }
}
```

| 字段      | 类型   | 说明                              |
| --------- | ------ | --------------------------------- |
| `code`    | number | `0` 表示成功，非 `0` 为业务错误码 |
| `message` | string | 人类可读的描述信息                |
| `data`    | any    | 业务数据，失败时可能为 `null`     |

**响应头：**

| 响应头                | 说明                                                 |
| --------------------- | ---------------------------------------------------- |
| `x-request-id`        | 本次请求的唯一 ID，排查问题时提供给服务端            |
| `x-client-request-id` | 仅在上游传入旧 `x-request-id` 时用于链路追踪保留原值 |

说明：服务端会始终重新生成新的 `x-request-id`，如果上游已传入同名请求头，原值会被转存为 `x-client-request-id` 用于追踪。

---

## 11. 错误码参考

### HTTP 状态码

| 状态码 | 含义                |
| ------ | ------------------- |
| `200`  | 成功                |
| `400`  | 请求参数错误        |
| `401`  | 未认证或 Token 失效 |
| `403`  | 无权限或账号被禁用  |
| `404`  | 资源不存在          |
| `422`  | 参数校验失败        |
| `429`  | 请求过于频繁        |
| `500`  | 服务端内部错误      |

### 业务错误码（`code` 字段）

| code   | 说明                 | 处理建议                                                               |
| ------ | -------------------- | ---------------------------------------------------------------------- |
| `0`    | 成功                 | —                                                                      |
| `1004` | 权限不足             | 检查当前账号权限或角色配置                                             |
| `1016` | 缺少防重放保护       | 为该接口补齐 `X-Nonce`、`X-Timestamp`、`X-Sign`、`X-Replay-Session-Id` |
| `1017` | 防重放校验失败       | 检查签名会话、签名内容、时间戳、Nonce、客户端指纹                      |
| `1018` | 需要二次验证         | 进入 2FA challenge 流程                                                |
| `1019` | 2FA challenge 已过期 | 重新发起登录或重新获取新的 challenge                                   |
| `1020` | 2FA 验证码无效       | 提示用户重新输入动态码/邮件码/恢复码                                   |
| `1028` | 需要先同意政策       | 引导用户勾选并重新提交登录请求                                         |

---

## 12. 速率限制

系统不仅存在业务级动作限流，还存在“错误追踪 → 权重累计 → 自动封禁”的独立风控链路。二者不要混为一谈。

### 12.1 业务级限流（面向认证动作）

当前已确认的细粒度限制包括：

- 登录 2FA 校验：按客户端 IP 与 `challengeToken` 双维度限制
- 登录 2FA 邮件验证码发送：按客户端 IP 与 `challengeToken` 双维度限制
- 注册验证码发送：按 IP 与邮箱组合限制
- 密码找回验证码发送：按 IP 与邮箱组合限制
- 2FA 可信设备列表/删除：按 IP 与 user 双维度限制

其中还存在一条很重要的实现差异：

- 注册验证码/密码找回验证码发送限制走数据库日志统计；
- 2FA 验证、2FA 邮件发送、可信设备操作限制走 Redis 计数；
- **Redis 型限流在 Redis 不可用时会 fail-open**，即返回 `allowed: true`，不会因为限流后端不可用而阻断业务；
- 这与 replay 校验的 fail-closed 策略正好相反，接入方不要混淆。

### 12.2 业务级限制一览

| 功能           | 按 IP 限制 | 按业务维度限制 | 时间窗口 |
| -------------- | ---------- | -------------- | -------- |
| 邮箱验证码发送 | 5 次       | 2 次/邮箱      | 60 分钟  |
| 2FA 验证       | 20 次      | 5 次/挑战      | 10 分钟  |
| 2FA 邮件发送   | 10 次      | 3 次/挑战      | 10 分钟  |
| 可信设备操作   | 60 次      | 30 次/用户     | 10 分钟  |

超出限制时返回 `429 Too Many Requests`，响应体中包含重试等待时间。

因此客户端不应把 `429` 仅理解为简单的“全局限流”，而应结合当前动作判断是：

- 当前 IP 请求过多
- 当前邮箱请求过多
- 当前 2FA challenge 尝试次数过多
- 当前 2FA challenge 发码次数过多

### 12.3 错误追踪与自动封禁不是固定 QPS 限流

此前若把它概括成“每 IP 每 60 分钟最多 5 次”是不准确的。真实实现更接近：

- 只追踪 **4xx/5xx** 响应；
- 不同 HTTP 状态码、不同业务错误码可配置不同权重；
- 白名单 IP 完全跳过错误追踪；
- 权重为 `0` 的错误不会计入；
- Redis 不可用时，错误追踪会直接跳过，不会阻断当前请求；
- 当累计错误权重达到阈值后，才会触发自动封禁。

因此它本质上是“基于错误信号的封禁升级机制”，而不是一个简单的、固定数字的全局请求频率限制器。

---

## 13. IP 黑白名单

- **白名单 IP**：豁免黑名单检查和错误追踪，适用于受信任的内部服务
- **黑名单 IP**：所有请求直接返回 `403 Forbidden`，响应体包含封禁原因和到期时间

补充说明：

- 白名单优先级高于黑名单检查
- 系统存在“错误权重累计 → 自动封禁”的风控机制
- 4xx/5xx 响应会进入错误追踪，不同状态码/业务错误码可配置不同权重
- 白名单 IP 永不参与自动封禁
- 如果 Redis 不可用，错误追踪会跳过，但不会因此关闭已有的黑名单拦截逻辑
- 黑名单检查中间件如果自身内部异常，当前实现会记录日志后 `next()` 放行，属于 **内部错误 fail-open**
- 错误追踪与黑名单拦截是两段独立链路：前者负责积累/触发封禁，后者负责在请求入口实际阻断

如需将你的服务 IP 加入白名单，联系系统管理员。

---

## 14. 权限系统

### 权限计算公式

```
最终权限 = 用户组权限 + 用户额外增加的权限 - 用户被移除的权限
```

### 权限不足响应

```json
{
  "code": 3001,
  "message": "Forbidden: insufficient permissions",
  "data": null
}
```

HTTP 状态码为 `403`。

权限校验通常发生在认证通过、防重放校验通过、风控校验通过之后，真正进入业务逻辑之前。

---

## 15. 完整请求示例

以下是一个携带 JWT 认证 + 防重放签名的完整请求示例（JavaScript）：

```javascript
import crypto from "crypto";

class ApiClient {
  constructor(baseUrl, accessToken, signingSession) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.signingSession = signingSession; // { sessionId, signingKey, expiresAt }
  }

  async request(method, path, body = null) {
    const nonce = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = body ? JSON.stringify(body) : "";

    const message = nonce + timestamp + path + bodyStr;
    const sign = crypto
      .createHmac("sha256", this.signingSession.signingKey)
      .update(message)
      .digest("hex");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "X-Nonce": nonce,
      "X-Timestamp": timestamp,
      "X-Sign": sign,
      "X-Replay-Session-Id": this.signingSession.sessionId,
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? bodyStr : undefined,
    });

    return response.json();
  }
}

// 使用示例
const client = new ApiClient(
  "https://api.qysyw.cn",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  {
    sessionId: "0a7b8d2e-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    signingKey: "6cf5b0f7b5d4...",
    expiresAt: "2025-01-01T00:10:00.000Z",
  },
);

const result = await client.request("GET", "/users/profile");
console.log(result);
```

**Python 示例：**

```python
import hmac
import hashlib
import uuid
import time
import json
import requests

class ApiClient:
    def __init__(self, base_url, access_token, signing_session):
        self.base_url = base_url
        self.access_token = access_token
        self.signing_session = signing_session  # dict: sessionId, signingKey, expiresAt

    def request(self, method, path, body=None):
        nonce = str(uuid.uuid4())
        timestamp = str(int(time.time()))
        body_str = json.dumps(body) if body else ""

        message = (nonce + timestamp + path + body_str).encode("utf-8")
        sign = hmac.new(self.signing_session["signingKey"].encode("utf-8"), message, hashlib.sha256).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            "X-Nonce": nonce,
            "X-Timestamp": timestamp,
            "X-Sign": sign,
            "X-Replay-Session-Id": self.signing_session["sessionId"],
        }

        url = self.base_url + path
        response = requests.request(
            method,
            url,
            headers=headers,
            data=body_str if body else None,
        )
        return response.json()

# 使用示例
client = ApiClient(
    base_url="https://api.qysyw.cn",
    access_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    signing_session={
      "sessionId": "0a7b8d2e-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "signingKey": "6cf5b0f7b5d4...",
      "expiresAt": "2025-01-01T00:10:00.000Z",
    }
)

result = client.request("GET", "/users/profile")
print(result)
```

---

## 16. 对接总结

为了降低接入过程中的理解成本，也可以把整套安全要求理解为一条分层链路：

1. 先选择合适的认证模型：`JWT` / `Access Key` / `Relay Token`
2. 若走浏览器用户态，按 **access token + refresh cookie-first** 方式实现
3. 对所有要求防重放的接口，实现 **签名会话获取 → nonce/timestamp/sign 生成 → 请求失败时重新签名** 的完整闭环
4. 对登录、注册、密码找回、2FA 邮件验证码等敏感接口，按需接入 `reCAPTCHA`
5. 对高风险写操作，准备处理 `2FA step-up`、`challengeToken`、`X-Onetime-Token` 与原请求重试
6. 在网关与代理层，正确处理 `x-request-id` 与 `x-client-request-id`：服务端会重写新的 `x-request-id`，上游传入值会被转存为 `x-client-request-id`
7. 在部署层，注意 Cookie、CORS、`trust proxy`、上传大小限制、Redis 可用性等安全前提

为了降低接入过程中的理解成本，可以把整套安全要求记成一句话：

> **先选认证方式，再按接口要求补充防重放和人机校验，最后通过 IP、限流、权限等服务端安全策略后进入业务。**

### 16.1 接入方应完成的最小实现

不同类型的接入方，至少应做到：

- **用户态前端**：实现 JWT 登录、Access Token 刷新、必要时接入 reCAPTCHA
- **开启 2FA 的用户态前端**：实现 challengeToken、验证码提交、可信设备与高风险请求重试
- **服务端程序集成**：安全保存 Access Key，避免泄露到前端或日志
- **代理/网关接入**：妥善管理 Relay Token 的分发和轮换
- **敏感接口调用方**：实现 Signing Session、Nonce、Timestamp、Sign 全链路

### 16.2 常见失败原因归纳

以下问题最容易导致对接失败：

1. 使用了错误的认证方式或令牌类型
2. Access Token 过期但未及时刷新
3. 签名内容拼接顺序错误
4. `path` 或 `body` 与服务端参与签名的原始内容不一致
5. Nonce 被重复使用
6. 客户端时间与服务端偏差过大
7. reCAPTCHA 的 token、score 或 action 不满足要求
8. IP 未在允许范围内，或触发限流、权限不足
9. 2FA challenge 已过期，或使用了错误的 code / emailCode / recoveryCode
10. 高风险接口重试时遗漏 `X-Onetime-Token` 或未重新生成防重放签名

### 16.3 全链路安全总结图

下列三张图分别覆盖用户态、程序化接入和代理中继三种主路径。相比单张总图，更适合导出 PDF 后阅读：

**用户态接入总链路：**

为避免单张时序图在 PDF 中被过度缩放，用户态总链路拆成 3 张更接近真实运行阶段的图：

**阶段 A：登录、政策同意、登录期 2FA**

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Auth API
  participant G as Auth Guard
  participant T as TwoFactor Service

  C->>A: POST /auth/login (+可选 recaptchaToken)
  A->>G: 校验账号/密码/政策/reCAPTCHA
  alt 需要先同意政策
    A-->>C: requiresPolicyConsent + challengeToken
    C->>A: POST /auth/accept-policy-consent
    A-->>C: 返回 access_token + refresh cookie
  else 无需登录期 2FA
    A-->>C: 返回 access_token + refresh cookie
  else 需要登录期 2FA
    A-->>C: requiresTwoFactor + challengeToken
    C->>A: POST /auth/verify-2fa
    A->>T: 校验 code / emailCode / recoveryCode
    alt 2FA 失败
      T-->>A: 1019 / 1020
      A-->>C: 登录闭环失败
    else 2FA 成功
      T-->>A: 建立 trusted device
      A-->>C: 返回 access_token + refresh cookie
    end
  end
```

**阶段 B：已登录请求、JWT、防重放、权限/限流/IP 校验**

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Auth API
  participant B as Business API
  participant G as Security Guard

  opt 接口要求防重放
    C->>A: GET /auth/replay-signing-session
    A-->>C: sessionId + signingKey + expiresAt
    C->>C: 生成 nonce / timestamp / sign
  end

  C->>B: 携带 JWT 请求业务接口
  B->>G: 校验 JWT / 账号状态
  alt JWT 无效或过期
    G-->>B: deny
    B-->>C: 401 需刷新或重登
  else JWT 有效
    opt 接口要求防重放
      B->>G: 校验 sessionId / timestamp / nonce / sign / fingerprint
      alt Replay 校验失败
        G-->>B: deny
        B-->>C: 1016 / 1017
      end
    end
    B->>G: 校验 IP / 限流 / 权限
    alt 风控或权限未通过
      G-->>B: deny
      B-->>C: 403 / 429
    else 校验通过
      B-->>C: 200 成功或业务错误码
    end
  end
```

**阶段 C：高风险 step-up 2FA 与单次重试**

```mermaid
sequenceDiagram
  participant C as Client
  participant B as Business API
  participant T as TwoFactor Guard
  participant A as Auth API

  C->>B: 携带 JWT 调用高风险接口
  B->>T: 校验 trusted window / oneTimeToken
  alt 普通 step-up 且 trusted=true
    T-->>B: 直接放行
    B-->>C: 200 成功或业务错误码
  else 需要再次 2FA
    T-->>B: 抛出 challengeToken
    B-->>C: 1018 TWO_FACTOR_REQUIRED
    C->>A: POST /auth/verify-2fa
    A-->>C: oneTimeToken
    C->>C: 重新生成 nonce / timestamp / sign
    C->>B: 重试原请求 + X-Onetime-Token
    B->>T: 校验 oneTimeToken
    T-->>B: 单次放行
    B-->>C: 200 成功或业务错误码
  end
```

**程序化接入总链路：**

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Auth API
  participant G as Security Guard
  participant B as Business API

  opt 接口要求防重放签名
    C->>A: GET /auth/replay-signing-session
    A-->>C: 返回 sessionId signingKey expiresAt
    C->>C: 生成 nonce timestamp sign
  end

  C->>B: 携带 Access Key 请求
  B->>G: 校验 key 状态 / 用户状态 / 权限
  opt 接口要求防重放
    B->>G: 校验 sessionId timestamp nonce sign fingerprint
  end
  B->>G: 校验 IP / 限流
  alt 任一校验失败
    G-->>B: deny
    B-->>C: 401 / 403 / 429
  else 全部通过
    B-->>C: 200 成功或业务错误码
  end
```

**代理中继接入总链路：**

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Auth API
  participant G as Security Guard
  participant B as Business API

  opt 接口要求防重放签名
    C->>A: GET /auth/replay-signing-session
    A-->>C: 返回 sessionId signingKey expiresAt
    C->>C: 生成 nonce timestamp sign
  end

  C->>B: 携带 Relay Token 请求
  B->>G: 校验 relay token / 所属账号 / 权限
  opt 接口要求防重放
    B->>G: 校验 sessionId timestamp nonce sign fingerprint
  end
  B->>G: 校验 IP / 限流
  alt 任一校验失败
    G-->>B: deny
    B-->>C: 401 / 403 / 429
  else 全部通过
    B-->>C: 200 成功或业务错误码
  end
```

### 16.4 JWT 会话生命周期补充图

如果你的系统是用户登录态接入，建议把 JWT 生命周期拆成“登录后活跃会话”和“过期后的刷新恢复”两段理解：

**A. 登录成功后的活跃会话：**

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant S as Server

  U->>C: 提交账号密码
  C->>S: POST /auth/login

  alt 登录失败
    S-->>C: 返回认证失败
  else 登录成功
    S-->>C: 返回 accessToken + refreshToken/Cookie
    loop 持续访问受保护接口
      C->>S: 携带 accessToken 发起请求
      S->>S: 校验账号状态 / updatedAt / jti
      alt 账号或令牌失效
        S-->>C: 401 需要重新登录
      else 状态正常
        S-->>C: 200 请求成功
      end
    end
  end
```

**B. Access Token 过期后的刷新恢复：**

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server

  loop accessToken 即将过期或已过期时
    C->>S: POST /auth/refresh（Cookie 优先，Body 兜底）
    alt refreshToken 无效或过期
      S-->>C: 401 需要重新登录
    else refreshToken 有效
      S-->>C: 返回新的 accessToken，并可能轮换 refresh Cookie
      C->>S: 携带新 accessToken 继续访问
      S-->>C: 200 请求成功
    end
  end
```

### 16.5 2FA 与高风险操作总结

如果你的对接场景涉及用户后台管理、高风险写接口、Access Key 管理或安全设置修改，请额外记住下面这条链路：

1. 登录成功不代表所有高风险接口都可直接执行
2. 可信设备窗口只能减少部分 challenge 频率，不能覆盖 `alwaysRequire` 接口
3. 某些高风险接口需要 `oneTimeToken` 做单次放行
4. 若原始请求还要求防重放，重试时必须重新计算 `nonce`、`timestamp`、`sign`

---

## 附录：对接检查清单

在正式对接前，确认以下事项：

- [ ] 已选择合适的认证方式（JWT / Access Key / Relay Token）
- [ ] 已按实际字段名处理 `access_token` / `refresh_token` / `challengeToken` 等返回结构
- [ ] 已实现 Access Token 自动刷新，且优先走 Cookie-first 刷新方案
- [ ] 已处理登录接口的三种分支：成功 / 需要 2FA / 需要同意政策
- [ ] 需要防重放保护的接口已实现签名逻辑
- [ ] 每次请求使用唯一的 Nonce（不可复用）
- [ ] 本地时钟与 NTP 同步，时差在 ±5 分钟内
- [ ] 签名会话有效期 10 分钟，已实现过期前自动刷新
- [ ] `X-Client-Fingerprint` 在签名会话申请与正式请求阶段保持一致
- [ ] 浏览器端敏感接口（登录/注册）已集成 reCAPTCHA v3，Token 随请求体传递
- [ ] 如用户启用了 2FA，已实现 `verify-2fa`、邮件验证码发送与 challenge 过期处理
- [ ] 如调用高风险接口，已实现 `X-Onetime-Token` 重试机制
- [ ] 已处理 `429` 速率限制响应（退避重试）
- [ ] 已处理 `401` Token 失效响应（刷新或重登录）
- [ ] 已处理 `403` 权限不足响应
- [ ] 生产环境使用 HTTPS（Cookie 的 Secure 标志依赖此项）
- [ ] 请求体不超过大小限制（JSON 5MB，文件上传视接口而定）
