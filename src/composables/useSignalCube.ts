import { ref, watch } from "vue";

export interface CubeFragment {
  id: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  rotate: number;
  size: number;
}

export function useSignalCube(draggerRef?: { value: HTMLElement | null }) {
  const cubeTiltX = ref(-12);
  const cubeTiltY = ref(18);
  const isCubeVisible = ref(false);
  const cubePosition = ref({ x: 28, y: 22 });
  const isCubeDragging = ref(false);
  const cubeFragments = ref<CubeFragment[]>([]);

  let cubePhysicsFrame: number | null = null;
  let cubeFragmentTimer: number | null = null;
  let cubeDragOffset = { x: 0, y: 0 };
  let cubeVelocity = { x: 0, y: 0 };
  let cubeAngularVelocity = { x: 0, y: 0 };
  let cubeAngularAcceleration = { x: 0, y: 0 };
  let lastCubePointer = { x: 0, y: 0, time: 0 };

  function tiltSignalCube(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;

    cubeAngularAcceleration = {
      x: cubeAngularAcceleration.x - offsetY * 280,
      y: cubeAngularAcceleration.y + offsetX * 320,
    };
  }

  function stopCubePhysics() {
    if (cubePhysicsFrame) {
      cancelAnimationFrame(cubePhysicsFrame);
      cubePhysicsFrame = null;
    }
  }

  function getCubeBounds(target: HTMLElement) {
    const parent = target.offsetParent as HTMLElement | null;

    if (!parent) {
      return null;
    }

    const parentRect = parent.getBoundingClientRect();

    return {
      parentRect,
      maxX: Math.max(parentRect.width - target.offsetWidth - 10, 0),
      maxY: Math.max(parentRect.height - target.offsetHeight - 10, 0),
    };
  }

  function runCubePhysics(target: HTMLElement) {
    stopCubePhysics();

    let lastTime = performance.now();
    const gravity = 1800;
    const bounce = 0.62;
    const friction = 0.985;
    const angularDrag = 0.992;
    const impactSpin = 0.34;

    const tick = (now: number) => {
      const bounds = getCubeBounds(target);

      if (!bounds || isCubeDragging.value) {
        cubePhysicsFrame = null;
        return;
      }

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.032);
      lastTime = now;
      cubeVelocity.y += gravity * deltaSeconds;
      cubeVelocity.x *= friction;
      cubeAngularVelocity.x += cubeAngularAcceleration.x * deltaSeconds;
      cubeAngularVelocity.y += cubeAngularAcceleration.y * deltaSeconds;
      cubeAngularVelocity.x *= angularDrag;
      cubeAngularVelocity.y *= angularDrag;
      cubeAngularAcceleration = { x: 0, y: 0 };

      let nextX = cubePosition.value.x + cubeVelocity.x * deltaSeconds;
      let nextY = cubePosition.value.y + cubeVelocity.y * deltaSeconds;

      if (nextX <= 10) {
        nextX = 10;
        cubeVelocity.x = Math.abs(cubeVelocity.x) * bounce;
        cubeAngularVelocity.y += cubeVelocity.y * impactSpin;
      } else if (nextX >= bounds.maxX) {
        nextX = bounds.maxX;
        cubeVelocity.x = -Math.abs(cubeVelocity.x) * bounce;
        cubeAngularVelocity.y -= cubeVelocity.y * impactSpin;
      }

      if (nextY <= 10) {
        nextY = 10;
        cubeVelocity.y = Math.abs(cubeVelocity.y) * bounce;
        cubeAngularVelocity.x -= cubeVelocity.x * impactSpin;
      } else if (nextY >= bounds.maxY) {
        nextY = bounds.maxY;
        cubeVelocity.y = -Math.abs(cubeVelocity.y) * bounce;
        cubeVelocity.x *= 0.82;
        cubeAngularVelocity.x += cubeVelocity.x * impactSpin;
      }

      cubePosition.value = { x: nextX, y: nextY };
      cubeTiltX.value += cubeAngularVelocity.x * deltaSeconds;
      cubeTiltY.value += cubeAngularVelocity.y * deltaSeconds;

      if (
        Math.abs(cubeVelocity.x) < 8 &&
        Math.abs(cubeVelocity.y) < 18 &&
        Math.abs(cubeAngularVelocity.x) < 4 &&
        Math.abs(cubeAngularVelocity.y) < 4 &&
        nextY >= bounds.maxY - 1
      ) {
        cubeVelocity = { x: 0, y: 0 };
        cubePhysicsFrame = null;
        return;
      }

      cubePhysicsFrame = requestAnimationFrame(tick);
    };

    cubePhysicsFrame = requestAnimationFrame(tick);
  }

  function dropSignalCube() {
    isCubeVisible.value = true;
    cubeFragments.value = [];

    if (cubeFragmentTimer) {
      clearTimeout(cubeFragmentTimer);
      cubeFragmentTimer = null;
    }

    stopCubePhysics();
    cubePosition.value = { x: 28, y: 22 };
    cubeVelocity = { x: 120, y: 0 };
    cubeAngularVelocity = { x: 220, y: -160 };
    cubeAngularAcceleration = { x: 0, y: 0 };
    cubeTiltX.value = -36;
    cubeTiltY.value = 24;

    requestAnimationFrame(() => {
      const target = draggerRef?.value;

      if (target) {
        runCubePhysics(target);
      }
    });
  }

  function explodeSignalCube() {
    const fragmentCount = 18;
    const centerX = cubePosition.value.x + 38;
    const centerY = cubePosition.value.y + 38;

    stopCubePhysics();
    isCubeDragging.value = false;
    isCubeVisible.value = false;
    cubeVelocity = { x: 0, y: 0 };
    cubeAngularVelocity = { x: 0, y: 0 };
    cubeAngularAcceleration = { x: 0, y: 0 };

    cubeFragments.value = Array.from({ length: fragmentCount }, (_, index) => {
      const angle = (Math.PI * 2 * index) / fragmentCount + Math.random() * 0.34;
      const distance = 34 + Math.random() * 78;

      return {
        id: Date.now() + index,
        originX: centerX,
        originY: centerY,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 18,
        rotate: -160 + Math.random() * 320,
        size: 4 + Math.random() * 10,
      };
    });

    cubeFragmentTimer = window.setTimeout(() => {
      cubeFragments.value = [];
      cubeFragmentTimer = null;
    }, 720);
  }

  function toggleSignalCube() {
    if (isCubeVisible.value) {
      explodeSignalCube();
      return;
    }

    dropSignalCube();
  }

  function startCubeDrag(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    const bounds = getCubeBounds(target);

    if (!bounds) {
      return;
    }

    stopCubePhysics();
    cubeDragOffset = {
      x: event.clientX - bounds.parentRect.left - cubePosition.value.x,
      y: event.clientY - bounds.parentRect.top - cubePosition.value.y,
    };
    cubeVelocity = { x: 0, y: 0 };
    cubeAngularAcceleration = { x: 0, y: 0 };
    lastCubePointer = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };

    isCubeDragging.value = true;
    target.setPointerCapture(event.pointerId);
    tiltSignalCube(event);
  }

  function moveCubeDrag(event: PointerEvent) {
    tiltSignalCube(event);

    if (!isCubeDragging.value) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const bounds = getCubeBounds(target);

    if (!bounds) {
      return;
    }

    const now = performance.now();
    const deltaSeconds = Math.max((now - lastCubePointer.time) / 1000, 0.001);
    cubeVelocity = {
      x: (event.clientX - lastCubePointer.x) / deltaSeconds,
      y: (event.clientY - lastCubePointer.y) / deltaSeconds,
    };
    cubeAngularVelocity = {
      x: cubeAngularVelocity.x + cubeVelocity.y * 0.18,
      y: cubeAngularVelocity.y - cubeVelocity.x * 0.18,
    };
    lastCubePointer = { x: event.clientX, y: event.clientY, time: now };

    const nextX = event.clientX - bounds.parentRect.left - cubeDragOffset.x;
    const nextY = event.clientY - bounds.parentRect.top - cubeDragOffset.y;

    cubePosition.value = {
      x: Math.min(Math.max(nextX, 10), bounds.maxX),
      y: Math.min(Math.max(nextY, 10), bounds.maxY),
    };
  }

  function stopCubeDrag(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    isCubeDragging.value = false;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    runCubePhysics(target);
  }

  function cleanup() {
    stopCubePhysics();
    if (cubeFragmentTimer) {
      clearTimeout(cubeFragmentTimer);
    }
  }

  return {
    cubeTiltX,
    cubeTiltY,
    isCubeVisible,
    cubePosition,
    isCubeDragging,
    cubeFragments,
    toggleSignalCube,
    startCubeDrag,
    moveCubeDrag,
    stopCubeDrag,
    explodeSignalCube,
    cleanup,
  };
}
