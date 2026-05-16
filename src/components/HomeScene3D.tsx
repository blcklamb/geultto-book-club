"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";

interface HomeScene3DProps {
  nextSchedule?: {
    date: string;
    place: any;
    book: any;
  };
  bookCoverUrl?: string;
}

const BACK_COLOR = new THREE.Color("#9A5A10");
const SPINE_COLOR = new THREE.Color("#6B3A1A");
const PAGE_COLOR = new THREE.Color("#F5EDD8");
const FRONT_COLOR_PLAIN = new THREE.Color("#C8782A");

function useBookAnimation() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.35 - 0.1;
    groupRef.current.rotation.x = Math.sin(t * 0.25) * 0.04;
  });
  return groupRef;
}

function BookMeshPlain({ bookTitle }: { bookTitle?: string }) {
  const groupRef = useBookAnimation();

  const materials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: SPINE_COLOR, roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: SPINE_COLOR, roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: PAGE_COLOR, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: PAGE_COLOR, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: FRONT_COLOR_PLAIN, roughness: 0.3, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: BACK_COLOR, roughness: 0.4 }),
    ],
    []
  );

  return (
    <group ref={groupRef}>
      <mesh material={materials} castShadow>
        <boxGeometry args={[1.5, 2.1, 0.22]} />
      </mesh>
      <Html center position={[0, 0, 0.12]}>
        <div className="pointer-events-none flex w-36 flex-col items-center gap-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-100/70">
            다음 독서
          </p>
          <p className="text-xs font-bold leading-snug text-white drop-shadow">
            {bookTitle ?? "일정 없음"}
          </p>
        </div>
      </Html>
    </group>
  );
}

function BookMeshWithCover({
  proxiedUrl,
  bookTitle,
}: {
  proxiedUrl: string;
  bookTitle?: string;
}) {
  const groupRef = useBookAnimation();
  const coverTexture = useTexture(proxiedUrl);

  // Three.js는 기본적으로 Y축 뒤집기 — 이미지 방향 보정
  coverTexture.flipY = true;

  const materials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: SPINE_COLOR, roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: SPINE_COLOR, roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: PAGE_COLOR, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: PAGE_COLOR, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ map: coverTexture, roughness: 0.3, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: BACK_COLOR, roughness: 0.4 }),
    ],
    [coverTexture]
  );

  return (
    <group ref={groupRef}>
      <mesh material={materials} castShadow>
        <boxGeometry args={[1.5, 2.1, 0.22]} />
      </mesh>
    </group>
  );
}

export function HomeScene3D({ nextSchedule, bookCoverUrl }: HomeScene3DProps) {
  const proxiedUrl = bookCoverUrl
    ? `/api/book-cover?url=${encodeURIComponent(bookCoverUrl)}`
    : undefined;

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200">
      <Canvas camera={{ position: [0, 0.4, 4], fov: 40 }} shadows>
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 3]} intensity={1.3} castShadow />
        <pointLight position={[-2, 2, 2]} intensity={0.4} color="#FFD580" />
        <Suspense fallback={null}>
          {proxiedUrl ? (
            <BookMeshWithCover proxiedUrl={proxiedUrl} bookTitle={nextSchedule?.book} />
          ) : (
            <BookMeshPlain bookTitle={nextSchedule?.book} />
          )}
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(Math.PI * 3) / 4}
        />
      </Canvas>
    </div>
  );
}
