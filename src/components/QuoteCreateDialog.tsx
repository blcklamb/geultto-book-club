"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type QuoteCreateDialogProps = {
  schedules: Array<{ id: string; title: string }>;
  redirectTo?: string;
};

export const QuoteCreateDialog: React.FC<QuoteCreateDialogProps> = ({
  schedules,
  redirectTo = "/quotes",
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(
    schedules[0]?.id ?? ""
  );

  useEffect(() => {
    if (!selectedScheduleId && schedules[0]?.id) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [selectedScheduleId, schedules]);

  return (
    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={schedules.length === 0}
          title={
            schedules.length === 0
              ? "등록된 모임이 없어 구절을 추가할 수 없습니다."
              : undefined
          }
        >
          구절 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 구절 추가</DialogTitle>
          <DialogDescription>
            연결할 모임과 구절 내용을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form action="/api/quotes" method="post" className="space-y-4">
          <input type="hidden" name="scheduleId" value={selectedScheduleId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="space-y-2 text-sm">
            <label className="space-y-1">
              <span className="text-slate-600">모임 선택</span>
              <Select
                value={selectedScheduleId}
                onValueChange={(value) => setSelectedScheduleId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="모임을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,120px]">
              <label className="space-y-1">
                <span className="text-slate-600">인상 깊은 구절</span>
                <Textarea
                  name="text"
                  required
                  placeholder="책에서 인상 깊었던 문장을 입력하세요"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-600">쪽수</span>
                <Input
                  name="pageNumber"
                  placeholder="123"
                  inputMode="numeric"
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!selectedScheduleId}>
              추가하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
