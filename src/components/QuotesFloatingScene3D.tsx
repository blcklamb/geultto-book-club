'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

type QuotesFloatingScene3DProps = {
  quotes: Array<{ id: string; text: string; page: string; scheduleTitle: string }>;
};

const FloatingQuote: React.FC<{ quote: QuotesFloatingScene3DProps['quotes'][number]; index: number }> = ({ quote, index }) => {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = Math.sin(t / 2 + index) / 6;
      mesh.current.position.y = Math.sin(t + index) * 0.3;
    }
  });
  return (
    <group position={[Math.sin(index) * 2, 1, Math.cos(index) * 2]}>
      <mesh ref={mesh}>
        <planeGeometry args={[2.2, 1.2]} />
        <meshStandardMaterial color={`hsl(${index * 40}, 70%, 80%)`} transparent opacity={0.85} />
      </mesh>
      <Html center>
        <div className="w-40 rounded-lg bg-white/80 p-3 text-xs text-slate-700 shadow">
          <p className="font-semibold">p.{quote.page}</p>
          <p className="mt-1 line-clamp-3">{quote.text}</p>
        </div>
      </Html>
    </group>
  );
};

export const QuotesFloatingScene3D: React.FC<QuotesFloatingScene3DProps> = ({ quotes }) => {
  const data = useMemo(() => quotes.slice(0, 6), [quotes]);

  return (
    <div className="h-[340px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95">
      <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 3, 2]} intensity={1} />
        <Suspense fallback={null}>
          {data.map((quote, idx) => (
            <FloatingQuote key={quote.id} quote={quote} index={idx} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
};
