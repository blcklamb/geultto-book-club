"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/client";

export type RealtimeSub = {
  table: string;
  filter?: string;
};

type Props = {
  channelId: string;
  subs: RealtimeSub[];
};

// 지정한 테이블/필터 조합을 구독하고 변경이 생기면 router.refresh()를 호출한다.
// subs 배열은 컴포넌트 생애 동안 변경되지 않는 상수로 전달해야 한다.
export function PageRealtime({ channelId, subs }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  // subs는 JSX에서 인라인 배열로 넘어와 매 렌더마다 새 참조가 생기므로 ref로 고정한다.
  const subsRef = useRef(subs);

  useEffect(() => {
    let channel = supabase.channel(channelId);

    for (const { table, filter } of subsRef.current) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => router.refresh(),
      );
    }

    channel.subscribe((status, err) => {
      if (err) console.error(`[Realtime:${channelId}] error:`, err);
    });

    return () => {
      supabase.removeChannel(channel);
    };
    // channelId와 supabase는 컴포넌트 마운트 시 한 번만 실행되면 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, supabase]);

  return null;
}
