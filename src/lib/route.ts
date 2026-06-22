import { useRoute } from "vue-router";

export function useIsActiveRoute() {
  const route = useRoute();

  function isActiveRoute(path: string) {
    if (path === "/tags") {
      return route.path.startsWith("/tags");
    }
    return route.path === path;
  }

  return { isActiveRoute };
}
