"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPointSourceLabel } from "@/lib/points";

type PointLogItem = {
  id: string;
  sourceType: string;
  points: number;
  memo: string | null;
  createdAt: string;
  scheduleTitle: string | null;
};

export function PointLogDialog({ logs }: { logs: PointLogItem[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          적립 로그 보기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>포인트 적립/차감 로그</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">아직 포인트 로그가 없습니다.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {getPointSourceLabel(log.sourceType)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString("ko-KR")}
                    {log.scheduleTitle ? ` · ${log.scheduleTitle}` : ""}
                  </p>
                  {log.memo ? (
                    <p className="mt-1 text-xs text-slate-500">{log.memo}</p>
                  ) : null}
                </div>
                <div
                  className={
                    log.points >= 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-rose-600"
                  }
                >
                  {log.points > 0 ? "+" : ""}
                  {log.points}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
