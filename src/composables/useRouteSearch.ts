import { computed, ref } from "vue";
import { getAllPosts } from "../lib/posts";
import router from "../router/index.ts";

export interface RouteSearchItem {
  title: string;
  subtitle: string;
  description: string;
  to: string;
  keywords: string;
}

const routeSearchItems: RouteSearchItem[] = [
  {
    title: "ROUTES",
    subtitle: "",
    description: "以 3D 环形导航进入各个内容模块。",
    to: "/",
    keywords: "routes 路由 导航 home route",
  },
  {
    title: "HOME",
    subtitle: "文章入口",
    description: "最近写作、归档和长期整理的文字记录。",
    to: "/home",
    keywords: "home 首页 blog 文章 写作",
  },
  {
    title: "PORTFOLIO",
    subtitle: "作品与实验",
    description: "项目、界面实验和长期维护工具展示。",
    to: "/portfolio",
    keywords: "portfolio 作品 项目 实验 LanFlare NDKY AppServer",
  },
  {
    title: "EXPERIENCE",
    subtitle: "经验轨迹",
    description: "工作方式、项目经验和阶段性复盘。",
    to: "/experience",
    keywords: "experience 经验 开源 协作 工程",
  },
  {
    title: "ARCHIVE",
    subtitle: "文章归档",
    description: "按时间浏览所有文章。",
    to: "/archive",
    keywords: "archive 归档 文章 时间线",
  },
  {
    title: "TAGS",
    subtitle: "标签索引",
    description: "按主题查看文章。",
    to: "/tags",
    keywords: "tags 标签 分类 主题",
  },
  {
    title: "LIFE",
    subtitle: "生活片段",
    description: "阅读、生活、情绪和日常节奏。",
    to: "/life",
    keywords: "life 生活 阅读 日常",
  },
  {
    title: "CONTACT",
    subtitle: "联系节点",
    description: "交流写作、界面、自动化和长期主义实践。",
    to: "/contact",
    keywords: "contact 联系 邮箱 交流",
  },
  {
    title: "FRIENDS",
    subtitle: "友链中继",
    description: "值得长期阅读和交换灵感的站点。",
    to: "/friends",
    keywords: "friends 友链 站点 链接",
  },
  {
    title: "ABOUT",
    subtitle: "身份信息",
    description: "作者、写作方式和内容组织思路。",
    to: "/about",
    keywords: "about 关于 作者 站点",
  },
  ...getAllPosts().map((post) => ({
    title: post.frontmatter.title,
    subtitle: post.frontmatter.tags.join(" / ") || "POST",
    description: post.frontmatter.summary || post.excerpt,
    to: `/post/${post.slug}`,
    keywords: [
      post.frontmatter.title,
      post.frontmatter.summary,
      post.excerpt,
      post.frontmatter.tags.join(" "),
      post.slug,
    ].join(" "),
  })),
];

export function useRouteSearch() {
  const routeSearchQuery = ref("");
  const routeSearchFocused = ref(false);

  const routeSearchResults = computed(() => {
    const query = routeSearchQuery.value.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return routeSearchItems
      .filter((item) =>
        [item.title, item.subtitle, item.description, item.keywords]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 6);
  });

  const showRouteSearchResults = computed(
    () => routeSearchFocused.value && routeSearchQuery.value.trim().length > 0,
  );

  function goToRouteSearchItem(item: RouteSearchItem) {
    routeSearchQuery.value = "";
    routeSearchFocused.value = false;
    void router.push(item.to);
  }

  function submitRouteSearch() {
    const firstResult = routeSearchResults.value[0];

    if (firstResult) {
      goToRouteSearchItem(firstResult);
    }
  }

  return {
    routeSearchQuery,
    routeSearchFocused,
    routeSearchResults,
    showRouteSearchResults,
    goToRouteSearchItem,
    submitRouteSearch,
  };
}
