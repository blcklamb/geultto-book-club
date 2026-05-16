import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@supabase/types";

export const CURRENT_POINT_COHORT = 5;

export const POINT_SOURCE_LABELS = {
  manual_facilitator: "발제자 신청 및 진행",
  topic_submission: "토론/워크 세션 주제 제출",
  review_submission: "독후감 제출",
  review_first_bonus: "독후감 1등 보너스",
  review_second_bonus: "독후감 2등 보너스",
  review_third_bonus: "독후감 3등 보너스",
  attendance: "독서 모임 참석",
  manual_event_lead: "모각독/도서 행사 주도",
  review_comment: "타인 독후감 코멘트",
  quote_submission: "인상 깊은 구절 제출",
  perfect_attendance_bonus: "개근 보너스",
  manual_no_show: "무단 불참",
  late_review: "독후감 지각 제출",
} as const;

export type PointSourceType = keyof typeof POINT_SOURCE_LABELS;

export const MANUAL_POINT_OPTIONS: Array<{
  sourceType: PointSourceType;
  points: number;
}> = [
  { sourceType: "manual_facilitator", points: 70 },
  { sourceType: "manual_event_lead", points: 3 },
  { sourceType: "manual_no_show", points: -15 },
  { sourceType: "perfect_attendance_bonus", points: 20 },
];

type Client = SupabaseClient<Database>;

type AwardPointInput = {
  userId: string;
  scheduleId?: string | null;
  sourceType: PointSourceType;
  sourceId?: string | null;
  points: number;
  memo?: string | null;
  createdBy?: string | null;
  idempotencyKey: string;
  cohort?: number;
  cap?: {
    scheduleId: string;
    limit: number;
  };
};

export async function awardPointTransaction(
  supabase: Client,
  input: AwardPointInput
) {
  const cohort = input.cohort ?? CURRENT_POINT_COHORT;
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, is_deactivated")
    .eq("id", input.userId)
    .maybeSingle();

  if (!targetUser || targetUser.is_deactivated) {
    return { awarded: false, reason: "inactive-user" as const };
  }

  if (input.scheduleId) {
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("cohort")
      .eq("id", input.scheduleId)
      .maybeSingle();

    if (scheduleError) {
      throw new Error("포인트 대상 일정 확인 실패: " + scheduleError.message);
    }

    if (schedule?.cohort !== cohort) {
      return { awarded: false, reason: "out-of-cohort" as const };
    }
  }

  if (input.cap) {
    const { count, error } = await supabase
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("cohort", cohort)
      .eq("user_id", input.userId)
      .eq("schedule_id", input.cap.scheduleId)
      .eq("source_type", input.sourceType);

    if (error) {
      throw new Error("포인트 제한 확인 실패: " + error.message);
    }

    if ((count ?? 0) >= input.cap.limit) {
      return { awarded: false, reason: "cap-reached" as const };
    }
  }

  const { error } = await supabase.from("point_transactions").insert({
    user_id: input.userId,
    schedule_id: input.scheduleId ?? null,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    points: input.points,
    memo: input.memo ?? null,
    created_by: input.createdBy ?? null,
    cohort,
    idempotency_key: input.idempotencyKey,
  });

  if (error) {
    if (error.code === "23505") {
      return { awarded: false, reason: "duplicate" as const };
    }
    throw new Error("포인트 기록 실패: " + error.message);
  }

  return { awarded: true, reason: "awarded" as const };
}

export async function deletePointTransactionsForSource(
  supabase: Client,
  sourceType: PointSourceType,
  sourceIds: string | string[]
) {
  const ids = Array.isArray(sourceIds) ? sourceIds : [sourceIds];
  const filteredIds = ids.filter(Boolean);
  if (filteredIds.length === 0) return;

  const { error } = await supabase
    .rpc("delete_point_transactions_for_source", {
      p_source_type: sourceType,
      p_source_ids: filteredIds,
      p_cohort: CURRENT_POINT_COHORT,
    });

  if (error) {
    throw new Error("포인트 삭제 실패: " + error.message);
  }
}

export async function recomputeReviewRankBonusPoints(
  supabase: Client,
  scheduleId: string
) {
  const { error } = await supabase.rpc("recompute_review_rank_bonus_points", {
    p_schedule_id: scheduleId,
    p_cohort: CURRENT_POINT_COHORT,
  });

  if (error) {
    throw new Error("독후감 순위 보너스 재계산 실패: " + error.message);
  }
}

export async function awardTopicSubmissionPoints(
  supabase: Client,
  input: { userId: string; scheduleId: string; topicId: string }
) {
  return awardPointTransaction(supabase, {
    userId: input.userId,
    scheduleId: input.scheduleId,
    sourceType: "topic_submission",
    sourceId: input.topicId,
    points: 20,
    idempotencyKey: `topic_submission:${input.topicId}`,
    cap: { scheduleId: input.scheduleId, limit: 2 },
  });
}

export async function awardReviewSubmissionPoints(
  supabase: Client,
  input: {
    userId: string;
    scheduleId: string;
    reviewId: string;
    scheduleDate: string;
    submittedAt: string;
  }
) {
  await awardPointTransaction(supabase, {
    userId: input.userId,
    scheduleId: input.scheduleId,
    sourceType: "review_submission",
    sourceId: input.reviewId,
    points: 8,
    idempotencyKey: `review_submission:${input.reviewId}`,
    cap: { scheduleId: input.scheduleId, limit: 1 },
  });

  if (new Date(input.submittedAt).getTime() > new Date(input.scheduleDate).getTime()) {
    await awardPointTransaction(supabase, {
      userId: input.userId,
      scheduleId: input.scheduleId,
      sourceType: "late_review",
      sourceId: input.reviewId,
      points: -5,
      idempotencyKey: `late_review:${input.reviewId}`,
    });
  }

  await recomputeReviewRankBonusPoints(supabase, input.scheduleId);
}

export async function awardQuoteSubmissionPoints(
  supabase: Client,
  input: { userId: string; scheduleId: string; quoteId: string }
) {
  return awardPointTransaction(supabase, {
    userId: input.userId,
    scheduleId: input.scheduleId,
    sourceType: "quote_submission",
    sourceId: input.quoteId,
    points: 1,
    idempotencyKey: `quote_submission:${input.quoteId}`,
    cap: { scheduleId: input.scheduleId, limit: 5 },
  });
}

export async function awardReviewCommentPoints(
  supabase: Client,
  input: {
    userId: string;
    scheduleId: string;
    reviewId: string;
    reviewAuthorId: string | null;
    commentId: string;
  }
) {
  if (!input.reviewAuthorId || input.reviewAuthorId === input.userId) {
    return { awarded: false, reason: "own-review" as const };
  }

  return awardPointTransaction(supabase, {
    userId: input.userId,
    scheduleId: input.scheduleId,
    sourceType: "review_comment",
    sourceId: input.commentId,
    points: 2,
    idempotencyKey: `review_comment:${input.commentId}`,
    cap: { scheduleId: input.scheduleId, limit: 8 },
  });
}

export async function syncAttendancePoints(supabase: Client) {
  const { data: schedules, error: scheduleError } = await supabase
    .from("schedules")
    .select("id")
    .eq("cohort", CURRENT_POINT_COHORT)
    .lte("date", new Date().toISOString());

  if (scheduleError) {
    throw new Error("참석 포인트 대상 일정 조회 실패: " + scheduleError.message);
  }

  const scheduleIds = (schedules ?? []).map((schedule) => schedule.id);
  if (scheduleIds.length === 0) return;

  const { data: attendees, error } = await supabase
    .from("schedule_attendees")
    .select("schedule_id, user_id, requested_attending, is_attending, actual_attended")
    .in("schedule_id", scheduleIds);

  if (error) {
    throw new Error("참석 포인트 동기화 실패: " + error.message);
  }

  for (const attendee of attendees ?? []) {
    const attended =
      attendee.actual_attended !== null && attendee.actual_attended !== undefined
        ? attendee.actual_attended
        : (attendee.requested_attending ?? attendee.is_attending ?? false);
    if (!attended || !attendee.schedule_id || !attendee.user_id) continue;

    await awardPointTransaction(supabase, {
      userId: attendee.user_id,
      scheduleId: attendee.schedule_id,
      sourceType: "attendance",
      sourceId: attendee.schedule_id,
      points: 5,
      idempotencyKey: `attendance:${attendee.schedule_id}:${attendee.user_id}`,
    });
  }
}

export async function syncPerfectAttendancePoints(supabase: Client) {
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStartDate = new Date(now);
  periodStartDate.setMonth(periodStartDate.getMonth() - 6);
  const periodStart = periodStartDate.toISOString();
  const periodKey = periodStart.slice(0, 10) + ":" + periodEnd.slice(0, 10);

  const { data: schedules, error: scheduleError } = await supabase
    .from("schedules")
    .select("id")
    .eq("cohort", CURRENT_POINT_COHORT)
    .gte("date", periodStart)
    .lte("date", periodEnd);

  if (scheduleError) {
    throw new Error("개근 대상 일정 조회 실패: " + scheduleError.message);
  }

  const scheduleIds = (schedules ?? []).map((schedule) => schedule.id);
  if (scheduleIds.length === 0) return;

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id")
    .in("role", ["member", "admin"])
    .eq("is_deactivated", false);

  if (usersError) {
    throw new Error("개근 대상 사용자 조회 실패: " + usersError.message);
  }

  for (const user of users ?? []) {
    const { data: rows, error: attendanceError } = await supabase
      .from("schedule_attendees")
      .select("schedule_id, requested_attending, is_attending, actual_attended")
      .eq("user_id", user.id)
      .in("schedule_id", scheduleIds);

    if (attendanceError) {
      throw new Error("개근 참석 조회 실패: " + attendanceError.message);
    }

    const attendedScheduleIds = new Set(
      (rows ?? [])
        .filter((row) => {
          const attended =
            row.actual_attended !== null && row.actual_attended !== undefined
              ? row.actual_attended
              : (row.requested_attending ?? row.is_attending ?? false);
          return attended;
        })
        .map((row) => row.schedule_id)
    );

    if (scheduleIds.every((scheduleId) => attendedScheduleIds.has(scheduleId))) {
      await awardPointTransaction(supabase, {
        userId: user.id,
        sourceType: "perfect_attendance_bonus",
        sourceId: periodKey,
        points: 20,
        memo: "최근 6개월 개근",
        idempotencyKey: `perfect_attendance:${periodKey}:${user.id}`,
      });
    }
  }
}

export async function syncAutomaticPoints(supabase: Client) {
  await syncAttendancePoints(supabase);
  await syncPerfectAttendancePoints(supabase);
}

export function getPointSourceLabel(sourceType: string) {
  return (
    POINT_SOURCE_LABELS[sourceType as PointSourceType] ??
    sourceType
  );
}
