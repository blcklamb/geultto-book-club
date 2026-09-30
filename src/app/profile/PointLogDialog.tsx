"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LocalizedDate } from "@/components/LocalizedDate";
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
        <div className="divide-y divide-border">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 적립된 포인트가 없습니다.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {getPointSourceLabel(log.sourceType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <LocalizedDate
                      value={log.createdAt}
                      options={{ dateStyle: "medium", timeStyle: "short" }}
                    />
                    {log.scheduleTitle ? ` · ${log.scheduleTitle}` : ""}
                  </p>
                  {log.memo ? (
                    <p className="mt-1 text-xs text-muted-foreground">{log.memo}</p>
                  ) : null}
                </div>
                <div
                  className={
                    log.points >= 0
                      ? "font-semibold text-success"
                      : "font-semibold text-destructive"
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
