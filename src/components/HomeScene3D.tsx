"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface HomeScene3DProps {
  nextSchedule?: {
    date: string;
    place: any;
    book: any;
  };
  bookCoverUrl?: string | null;
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
  coverTexture,
}: {
  coverTexture: THREE.Texture;
}) {
  const groupRef = useBookAnimation();

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

function BookMeshWithFallback({
  proxiedUrl,
  bookTitle,
}: {
  proxiedUrl: string;
  bookTitle?: string;
}) {
  const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;
    setCoverTexture(null);

    new THREE.TextureLoader().load(
      proxiedUrl,
      (texture) => {
        if (!active) {
          texture.dispose();
          return;
        }

        // Three.js는 기본적으로 Y축을 뒤집으므로 표지 방향을 보정한다.
        texture.flipY = true;
        loadedTexture = texture;
        setCoverTexture(texture);
      },
      undefined,
      () => {
        if (active) setCoverTexture(null);
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [proxiedUrl]);

  return coverTexture ? (
    <BookMeshWithCover coverTexture={coverTexture} />
  ) : (
    <BookMeshPlain bookTitle={bookTitle} />
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
        {proxiedUrl ? (
          <BookMeshWithFallback
            proxiedUrl={proxiedUrl}
            bookTitle={nextSchedule?.book}
          />
        ) : (
          <BookMeshPlain bookTitle={nextSchedule?.book} />
        )}
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
