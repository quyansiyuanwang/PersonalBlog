# PersonalBlog

一个基于 `Vue 3 + Vite + Element Plus` 的静态个人博客，文章内容与音乐都直接从仓库目录维护，可直接部署到 `GitHub Pages`。

## 功能

- 首页文章流
- 文章详情页
- 关于页
- 归档页
- 标签页
- Markdown 驱动内容
- 仓库目录驱动音乐清单
- GitHub Actions 自动部署到 GitHub Pages

## 本地开发

安装依赖：

`pnpm install`

启动开发环境：

`pnpm dev`

生产构建：

`pnpm build`

预览构建结果：

`pnpm preview`

## 内容维护

- 文章目录：`content/posts/*.md`
- 关于页：`content/about.md`
- 音乐目录：`music/*`

你以后只需要：

1. 在 `content/posts/` 下新建一个 `.md` 文件写文章
2. 如需修改关于页，直接编辑 `content/about.md`
3. 在 `music/` 下放入音频文件，构建时会自动复制到站点并生成播放列表

构建时会自动生成：

- `src/generated/content.ts`
- `src/lib/music.ts`

每篇文章使用 frontmatter：

- `title`
- `date`
- `summary`
- `tags`
- `cover`（可选）
- `draft`（可选）

示例：

```yaml
---
title: "文章标题"
date: "2026-06-04"
summary: "一句摘要"
tags:
  - Vue
  - 随笔
---
```

## GitHub Pages 部署

当前 `vite.config.ts` 中已设置：

- `base: '/PersonalBlog/'`

如果你的 GitHub 仓库名不是 `PersonalBlog`，请把它改成你的实际仓库名。

工作流文件位于：

- `.github/workflows/deploy.yml`

在 GitHub 仓库中启用 Pages，并将来源设置为 `GitHub Actions` 即可。

## GitHub Pages 维护方式

适合你的日常流程是：

1. 直接往仓库的 `content/posts/` 写 Markdown 文章
2. 直接往仓库的 `music/` 上传音频文件
3. 推送到 `main`
4. GitHub Actions 自动构建并部署到 Pages

如果你的仓库名不是 `PersonalBlog`，记得修改 `vite.config.ts` 中的 `base`，以及 `src/lib/site.ts` 中的 `repoName` 和 `siteUrl`。
