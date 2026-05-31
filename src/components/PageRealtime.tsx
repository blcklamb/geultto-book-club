"use client";

import { useEffect, useMemo } from "react";
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

export function PageRealtime({ channelId, subs }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const subsKey = JSON.stringify(subs);
  const stableSubs = useMemo(
    () => JSON.parse(subsKey) as RealtimeSub[],
    [subsKey],
  );

  useEffect(() => {
    let channel = supabase.channel(channelId);

    for (const { table, filter } of stableSubs) {
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
  }, [channelId, router, stableSubs, supabase]);

  return null;
}
