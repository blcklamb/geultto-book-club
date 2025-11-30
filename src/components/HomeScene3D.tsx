"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface HomeScene3DProps {
  nextSchedule?: {
    date: string;
    place: any;
    book: any;
  };
}
export function HomeScene3D(props: HomeScene3DProps) {
  return (
    <div className="h-64 w-full">
      <Canvas>
        <ambientLight />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial />
        </mesh>
        <OrbitControls />
      </Canvas>
    </div>
  );
}
