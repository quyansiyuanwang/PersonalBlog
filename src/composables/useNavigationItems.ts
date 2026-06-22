import router from "../router/index.ts";

export interface NavigationItem {
  name: string;
  to: string;
  label: string;
  jump: boolean;
  fn?: () => void;
  hide: boolean;
}

export function useNavigationItems() {
  const navigationItems: NavigationItem[] = [
    {
      name: "返回",
      to: "",
      label: "↓",
      jump: false,
      fn: () => router.back(),
      hide: false,
    },
    { name: "首页", to: "/home", label: "HOME", jump: true, hide: false },
    { name: "归档", to: "/archive", label: "ARCHIVE", jump: true, hide: false },
    { name: "标签", to: "/tags", label: "TAGS", jump: true, hide: false },
    { name: "关于", to: "/about", label: "ABOUT", jump: true, hide: false },
    {
      name: "作品",
      to: "/portfolio",
      label: "PORTFOLIO",
      jump: true,
      hide: false,
    },
    {
      name: "返回",
      to: "",
      label: "ROUTES",
      jump: false,
      fn: () => router.replace("/"),
      hide: false,
    },
  ];

  return { navigationItems };
}
