"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ScheduleTimetableItem = {
  id: string;
  startTime: string;
  endTime: string;
  detail: string;
};

type EditableTimetableItem = ScheduleTimetableItem & {
  rowId: string;
};

type ScheduleTimetableEditorProps = {
  scheduleId: string;
  items: ScheduleTimetableItem[];
  canEdit: boolean;
};

const DEFAULT_START_TIME = "10:00";

function toTimeInputValue(value: string) {
  return value.slice(0, 5);
}

function createEditableItem(
  item: Omit<ScheduleTimetableItem, "id"> & { id?: string },
  rowId: string,
): EditableTimetableItem {
  return {
    id: item.id ?? "",
    rowId,
    startTime: toTimeInputValue(item.startTime),
    endTime: toTimeInputValue(item.endTime),
    detail: item.detail,
  };
}

function displayTimeRange(item: ScheduleTimetableItem) {
  return `${toTimeInputValue(item.startTime)}-${toTimeInputValue(item.endTime)}`;
}

export function ScheduleTimetableEditor({
  scheduleId,
  items,
  canEdit,
}: ScheduleTimetableEditorProps) {
  const rowCounter = useRef(0);
  const nextRowId = () => {
    rowCounter.current += 1;
    return `row-${rowCounter.current}`;
  };
  const [isEditing, setIsEditing] = useState(false);
  const [rows, setRows] = useState<EditableTimetableItem[]>(() => {
    const initialRows = items.map((item) =>
      createEditableItem(
        {
          id: item.id,
          startTime: item.startTime,
          endTime: item.endTime,
          detail: item.detail,
        },
        nextRowId(),
      ),
    );

    return initialRows.length > 0
      ? initialRows
      : [
          createEditableItem(
            { startTime: DEFAULT_START_TIME, endTime: "", detail: "" },
            nextRowId(),
          ),
        ];
  });

  const serializedRows = JSON.stringify(
    rows.map((row) => ({
      startTime: row.startTime,
      endTime: row.endTime,
      detail: row.detail,
    })),
  );

  const updateRow = (
    rowId: string,
    field: keyof Pick<EditableTimetableItem, "startTime" | "endTime" | "detail">,
    value: string,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.rowId === rowId ? { ...row, [field]: value } : row,
      ),
    );
  };

  const moveRow = (rowId: string, direction: -1 | 1) => {
    setRows((currentRows) => {
      const index = currentRows.findIndex((row) => row.rowId === rowId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= currentRows.length) {
        return currentRows;
      }
      const nextRows = [...currentRows];
      const [row] = nextRows.splice(index, 1);
      nextRows.splice(nextIndex, 0, row);
      return nextRows;
    });
  };

  const addRow = () => {
    setRows((currentRows) => {
      const previousEndTime = currentRows.at(-1)?.endTime || DEFAULT_START_TIME;
      return [
        ...currentRows,
        createEditableItem(
          { startTime: previousEndTime, endTime: "", detail: "" },
          nextRowId(),
        ),
      ];
    });
  };

  const removeRow = (rowId: string) => {
    setRows((currentRows) =>
      currentRows.filter((row) => row.rowId !== rowId),
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">타임테이블</CardTitle>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant={isEditing ? "ghost" : "outline"}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? <X aria-hidden="true" /> : <Pencil aria-hidden="true" />}
            {isEditing ? "취소" : "편집"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isEditing && canEdit ? (
          <form
            action={`/api/schedule/${scheduleId}/timetable`}
            method="post"
            className="space-y-4"
          >
            <input type="hidden" name="items" value={serializedRows} readOnly />
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.rowId}
                  className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[8rem_8rem_1fr_auto]"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`start-${row.rowId}`}>시작 시간</Label>
                    <Input
                      id={`start-${row.rowId}`}
                      type="time"
                      value={row.startTime}
                      required
                      onChange={(event) =>
                        updateRow(row.rowId, "startTime", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`end-${row.rowId}`}>종료 시간</Label>
                    <Input
                      id={`end-${row.rowId}`}
                      type="time"
                      value={row.endTime}
                      required
                      onChange={(event) =>
                        updateRow(row.rowId, "endTime", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`detail-${row.rowId}`}>상세 항목</Label>
                    <Input
                      id={`detail-${row.rowId}`}
                      value={row.detail}
                      required
                      placeholder="예: 독후감 공유"
                      onChange={(event) =>
                        updateRow(row.rowId, "detail", event.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="위로 이동"
                      disabled={index === 0}
                      onClick={() => moveRow(row.rowId, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="아래로 이동"
                      disabled={index === rows.length - 1}
                      onClick={() => moveRow(row.rowId, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="행 삭제"
                      onClick={() => removeRow(row.rowId)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={addRow}>
                <Plus aria-hidden="true" />행 추가
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        ) : items.length > 0 ? (
          <Table className="border border-slate-200">
            <TableHeader className="sr-only">
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>상세 항목</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-transparent">
                  <TableCell className="w-40 border-r border-slate-200 px-4 py-4 text-lg font-medium text-slate-900">
                    {displayTimeRange(item)}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-lg font-medium text-slate-900">
                    {item.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-slate-500">
            등록된 타임테이블이 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
