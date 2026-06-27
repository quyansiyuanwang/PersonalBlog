import { ref, type Ref } from "vue";

export function usePanelGeometry(
  shellMainRef: Ref<HTMLElement | null>,
  leftPanelShellRef: Ref<HTMLElement | null>,
  leftPanelCollapsed: Ref<boolean>,
  isLeftPanelHalfCollapsed: Ref<boolean>,
  showToc: Ref<boolean>,
) {
  const isDesktop = ref(true);
  let leftPanelAnimationFrame: number | null = null;
  let leftPanelHeightAnimationFrame: number | null = null;

  function getExpandedLeftWidth(shellWidth: number) {
    return Math.round(shellWidth * 0.4);
  }

  function getHalfCollapsedLeftWidth(shellWidth: number) {
    return Math.round(shellWidth * 0.22);
  }

  function getCollapsedLeftWidth() {
    return 116;
  }

  function getExpandedLeftHeight(panelHeight: number) {
    return Math.round(panelHeight * 0.7);
  }

  function getExpandedPostLeftHeight(panelHeight: number) {
    return panelHeight;
  }

  function easeOutQuart(progress: number) {
    return 1 - Math.pow(1 - progress, 4);
  }

  function getTargetLeftWidth(shellWidth: number) {
    if (leftPanelCollapsed.value) {
      return getCollapsedLeftWidth();
    }

    return isLeftPanelHalfCollapsed.value
      ? getHalfCollapsedLeftWidth(shellWidth)
      : getExpandedLeftWidth(shellWidth);
  }

  function shouldUseVerticalShellLayout() {
    return window.matchMedia("(max-width: 1280px)").matches;
  }

  function syncViewportState() {
    isDesktop.value = !window.matchMedia("(max-width: 820px)").matches;
  }

  function getComputedLeftRatio(shellMain: HTMLElement) {
    const columns = window.getComputedStyle(shellMain).gridTemplateColumns;
    const leftColumn = Number.parseFloat(columns.split(" ")[0] ?? "0");
    const shellWidth = shellMain.getBoundingClientRect().width;

    if (!shellWidth || !leftColumn) {
      if (leftPanelCollapsed.value) {
        return getCollapsedLeftWidth() / Math.max(shellWidth, 1);
      }

      return isLeftPanelHalfCollapsed.value ? 0.22 : 0.4;
    }

    return leftColumn / shellWidth;
  }

  function animateLeftPanelTo(targetWidth: number, targetHeight?: number) {
    const shellMain = shellMainRef.value;
    const shell = leftPanelShellRef.value;

    if (!shellMain) {
      return;
    }

    if (leftPanelAnimationFrame) {
      cancelAnimationFrame(leftPanelAnimationFrame);
      leftPanelAnimationFrame = null;
    }
    if (targetHeight !== undefined && leftPanelHeightAnimationFrame) {
      cancelAnimationFrame(leftPanelHeightAnimationFrame);
      leftPanelHeightAnimationFrame = null;
    }

    if (shouldUseVerticalShellLayout()) {
      shellMain.style.removeProperty("grid-template-columns");
      if (shell) shell.style.removeProperty("height");
      return;
    }

    const shellWidth = shellMain.getBoundingClientRect().width;
    const startWidth = shellWidth * getComputedLeftRatio(shellMain);
    const startHeight = targetHeight !== undefined && shell
      ? shell.getBoundingClientRect().height
      : 0;
    const finalHeight = targetHeight !== undefined && shell ? targetHeight : startHeight;
    const duration = 520;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const currentWidth = startWidth + (targetWidth - startWidth) * eased;

      shellMain.style.gridTemplateColumns = `${currentWidth}px minmax(0, 1fr)`;

      if (targetHeight !== undefined && shell) {
        const currentHeight = startHeight + (finalHeight - startHeight) * eased;
        shell.style.height = `${currentHeight}px`;
      }

      if (progress < 1) {
        leftPanelAnimationFrame = requestAnimationFrame(tick);
        return;
      }

      leftPanelAnimationFrame = null;
      shellMain.style.gridTemplateColumns = `${targetWidth}px minmax(0, 1fr)`;
      if (targetHeight !== undefined && shell) {
        leftPanelHeightAnimationFrame = null;
        shell.style.height = `${finalHeight}px`;
      }
    };

    leftPanelAnimationFrame = requestAnimationFrame(tick);
  }

  function getTargetLeftHeight(panelHeight: number) {
    return isLeftPanelHalfCollapsed.value && showToc.value
      ? getExpandedPostLeftHeight(panelHeight)
      : getExpandedLeftHeight(panelHeight);
  }

  function animateLeftPanelHeightTo(targetHeight: number) {
    const shell = leftPanelShellRef.value;

    if (!shell) {
      return;
    }

    if (leftPanelHeightAnimationFrame) {
      cancelAnimationFrame(leftPanelHeightAnimationFrame);
      leftPanelHeightAnimationFrame = null;
    }

    const startHeight = shell.getBoundingClientRect().height;
    const duration = 520;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const currentHeight = startHeight + (targetHeight - startHeight) * eased;

      shell.style.height = `${currentHeight}px`;

      if (progress < 1) {
        leftPanelHeightAnimationFrame = requestAnimationFrame(tick);
        return;
      }

      leftPanelHeightAnimationFrame = null;
      shell.style.height = `${targetHeight}px`;
    };

    leftPanelHeightAnimationFrame = requestAnimationFrame(tick);
  }

  function syncLeftPanelWidth() {
    const shellMain = shellMainRef.value;
    if (!shellMain || leftPanelAnimationFrame) {
      return;
    }

    if (shouldUseVerticalShellLayout()) {
      shellMain.style.removeProperty("grid-template-columns");
      return;
    }

    const shellWidth = shellMain.getBoundingClientRect().width;
    shellMain.style.gridTemplateColumns = `${getTargetLeftWidth(shellWidth)}px minmax(0, 1fr)`;
  }

  function syncLeftPanelHeight() {
    const shell = leftPanelShellRef.value;
    const panel = shell?.parentElement;

    if (!shell || !panel || leftPanelHeightAnimationFrame) {
      return;
    }

    const panelHeight = panel.getBoundingClientRect().height;
    shell.style.height = `${getTargetLeftHeight(panelHeight)}px`;
  }

  function syncLeftPanelGeometry() {
    syncLeftPanelWidth();
    syncLeftPanelHeight();
  }

  function cleanup() {
    if (leftPanelAnimationFrame) {
      cancelAnimationFrame(leftPanelAnimationFrame);
    }

    if (leftPanelHeightAnimationFrame) {
      cancelAnimationFrame(leftPanelHeightAnimationFrame);
    }
  }

  return {
    isDesktop,
    syncViewportState,
    syncLeftPanelGeometry,
    animateLeftPanelTo,
    animateLeftPanelHeightTo,
    getTargetLeftHeight,
    getTargetLeftWidth,
    getHalfCollapsedLeftWidth,
    getExpandedLeftWidth,
    getExpandedLeftHeight,
    getExpandedPostLeftHeight,
    cleanup,
  };
}
