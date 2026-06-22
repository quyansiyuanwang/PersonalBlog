import { ref, onMounted } from "vue";

export interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

export function useParticles(count = 24) {
  const particles = ref<Particle[]>([]);

  onMounted(() => {
    const items: Particle[] = [];
    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        left: `${60 + Math.random() * 38}%`,
        top: `${10 + Math.random() * 80}%`,
        size: 2 + Math.random() * 3,
        duration: 10 + Math.random() * 10,
        delay: Math.random() * 8,
        driftX: -10 + Math.random() * 20,
        driftY: -80 - Math.random() * 60,
      });
    }
    particles.value = items;
  });

  return { particles };
}
