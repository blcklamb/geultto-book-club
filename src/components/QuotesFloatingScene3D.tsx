"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";

type QuotesFloatingScene3DProps = {
  quotes: Array<{
    id: string;
    text: string;
    page: string;
    scheduleTitle: string;
    author: string;
    authorImageUrl?: string | null;
    authorDecoration?: string | null;
  }>;
};

const FloatingQuote: React.FC<{
  quote: QuotesFloatingScene3DProps["quotes"][number];
  index: number;
}> = ({ quote, index }) => {
  const router = useRouter();
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const basePosition = useMemo(() => {
    // Spread cards further out in a loose ring and stagger heights.
    const angle = index * 1.6;
    const radius = 3.5 + (index % 3) * 0.6;
    const y = 0.6 + (index % 4) * 0.2;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
  }, [index]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      const slowOrbit = t / 4 + index * 0.6;
      const orbitRadius = 0.7;
      group.current.position.x =
        basePosition.x + Math.cos(slowOrbit) * orbitRadius;
      group.current.position.z =
        basePosition.z + Math.sin(slowOrbit) * orbitRadius;
      group.current.position.y =
        basePosition.y + Math.sin(t * 1.2 + index) * 0.4;
    }
    if (mesh.current) {
      mesh.current.rotation.y = Math.sin(t / 2 + index) / 6;
      mesh.current.position.y = Math.sin(t + index) * 0.25;
    }
  });
  const handleOpenQuote = () => {
    router.push(`/quotes/${quote.id}`);
  };
  return (
    <group ref={group} position={basePosition.toArray()}>
      <mesh ref={mesh}>
        <planeGeometry args={[2.2, 1.2]} />
        {/* 한 가지 웜 톤의 명도만 바꿔 카드 뒤판을 구분한다 */}
        <meshBasicMaterial
          color={`hsl(35, 20%, ${92 - (index % 3) * 4}%)`}
        />
      </mesh>
      <Html center>
        <div
          role="button"
          tabIndex={0}
          onClick={handleOpenQuote}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleOpenQuote();
            }
          }}
          aria-label={`${quote.scheduleTitle} ${quote.page}쪽 구절 보기`}
          className="flex w-40 cursor-pointer flex-col gap-1 rounded-lg border border-border bg-card p-3 text-xs text-foreground transition-colors hover:border-input hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-muted-foreground">{quote.scheduleTitle}</p>
          <p className="font-semibold">p.{quote.page}</p>
          <p className="line-clamp-3">{quote.text}</p>
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <UserAvatar
              imageUrl={quote.authorImageUrl}
              decoration={quote.authorDecoration}
              size="sm"
            />
            <span>by {quote.author}</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

export const QuotesFloatingScene3D: React.FC<QuotesFloatingScene3DProps> = ({
  quotes,
}) => {
  const data = useMemo(() => quotes.slice(0, 6), [quotes]);
  return (
    <div className="h-[340px] w-full overflow-hidden rounded-lg border border-border bg-muted">
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
