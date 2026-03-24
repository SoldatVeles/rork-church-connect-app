import { publicProcedure, createTRPCRouter } from "../../create-context";
import { z } from "zod";
import type {
  Sabbath,
  SabbathAssignment,
  SabbathAttendance,
  SabbathRole,
  SabbathAssignmentStatus,
  SabbathDetailView,
  SabbathGroupInfo,
  UpcomingResponsibilityItem,
  SabbathDateGroup,
} from "@/types/sabbath";
import { ALL_ROLES } from "@/types/sabbath";
import {
  formatSabbathDate,
  isSaturday,
} from "@/utils/sabbath";

const sabbathRoleEnum = z.enum([
  "first_part_leader",
  "lesson_presenter",
  "second_part_leader",
  "sermon_speaker",
]);

const sabbathAttendanceStatusEnum = z.enum(["attending", "not_attending"]);

type SupabaseAny = any;

function db(supabase: any): SupabaseAny {
  return supabase;
}

async function getAuthenticatedUser(ctx: { supabase: any; req: Request }) {
  const authHeader = ctx.req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const {
    data: { user },
    error,
  } = await ctx.supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  return user;
}

async function getUserProfile(supabase: SupabaseAny, userId: string) {
  const { data: profile, error } = await db(supabase)
    .from("profiles")
    .select("id, role, home_group_id, full_name, display_name")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error("Profile not found");
  }

  return profile as {
    id: string;
    role: string;
    home_group_id: string | null;
    full_name: string | null;
    display_name: string | null;
  };
}

async function checkIsAdmin(supabase: SupabaseAny, userId: string): Promise<boolean> {
  const profile = await getUserProfile(supabase, userId);
  return profile.role === "admin";
}

async function checkIsChurchPastor(
  supabase: SupabaseAny,
  userId: string,
  groupId: string
): Promise<boolean> {
  const { data, error } = await db(supabase)
    .from("group_pastors")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && !!data;
}

async function checkCanManageSabbath(
  supabase: SupabaseAny,
  userId: string,
  groupId: string
): Promise<boolean> {
  const isAdmin = await checkIsAdmin(supabase, userId);
  if (isAdmin) return true;
  return checkIsChurchPastor(supabase, userId, groupId);
}

async function requireCanManageSabbath(
  supabase: SupabaseAny,
  userId: string,
  groupId: string
): Promise<void> {
  const canManage = await checkCanManageSabbath(supabase, userId, groupId);
  if (!canManage) {
    throw new Error(
      "Only admins or pastors of this church can manage Sabbaths"
    );
  }
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayDateString(): string {
  return toDateString(new Date());
}

// ─── QUERIES ───────────────────────────────────────────────

const getMyChurchUpcoming = publicProcedure.query(async ({ ctx }) => {
  const user = await getAuthenticatedUser(ctx);
  const profile = await getUserProfile(ctx.supabase, user.id);

  if (!profile.home_group_id) {
    console.log(
      "[sabbaths.getMyChurchUpcoming] User has no home church assigned"
    );
    return null;
  }

  const today = getTodayDateString();

  const { data: sabbath, error } = await db(ctx.supabase)
    .from("sabbaths")
    .select("*")
    .eq("group_id", profile.home_group_id)
    .gte("sabbath_date", today)
    .in("status", ["published", "draft"])
    .order("sabbath_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[sabbaths.getMyChurchUpcoming] Error:", error);
    throw new Error(error.message);
  }

  if (!sabbath) {
    console.log("[sabbaths.getMyChurchUpcoming] No upcoming Sabbath found");
    return null;
  }

  const { data: group } = await db(ctx.supabase)
    .from("groups")
    .select("id, name")
    .eq("id", profile.home_group_id)
    .single();

  const groupInfo: SabbathGroupInfo = group
    ? { id: group.id, name: group.name }
    : { id: profile.home_group_id, name: "Unknown Church" };

  return {
    sabbath: sabbath as Sabbath,
    group: groupInfo,
  };
});

const getSwitzerlandUpcomingByDate = publicProcedure.query(async ({ ctx }) => {
  await getAuthenticatedUser(ctx);
  const today = getTodayDateString();

  console.log(
    "[sabbaths.getSwitzerlandUpcomingByDate] Fetching upcoming Sabbaths from",
    today
  );

  const { data: sabbaths, error } = await db(ctx.supabase)
    .from("sabbaths")
    .select("*")
    .gte("sabbath_date", today)
    .in("status", ["published", "cancelled"])
    .order("sabbath_date", { ascending: true });

  if (error) {
    console.error("[sabbaths.getSwitzerlandUpcomingByDate] Error:", error);
    throw new Error(error.message);
  }

  if (!sabbaths || sabbaths.length === 0) {
    return [] as SabbathDateGroup[];
  }

  const groupIds = [
    ...new Set((sabbaths as Sabbath[]).map((s: Sabbath) => s.group_id)),
  ];
  const { data: groups } = await db(ctx.supabase)
    .from("groups")
    .select("id, name")
    .in("id", groupIds);

  const groupMap = new Map<string, string>();
  if (groups) {
    for (const g of groups as Array<{ id: string; name: string }>) {
      groupMap.set(g.id, g.name);
    }
  }

  const dateGroups = new Map<string, Sabbath[]>();
  for (const s of sabbaths as Sabbath[]) {
    const key = s.sabbath_date;
    const existing = dateGroups.get(key);
    if (existing) {
      existing.push(s);
    } else {
      dateGroups.set(key, [s]);
    }
  }

  const result: SabbathDateGroup[] = Array.from(dateGroups.entries()).map(
    ([dateKey, items]) => ({
      date: dateKey,
      label: formatSabbathDate(dateKey),
      sabbaths: items,
    })
  );

  console.log(
    "[sabbaths.getSwitzerlandUpcomingByDate] Returning",
    result.length,
    "date groups"
  );
  return result;
});

const getSabbathDetail = publicProcedure
  .input(z.object({ sabbathId: z.string() }))
  .query(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);
    const profile = await getUserProfile(ctx.supabase, user.id);

    console.log("[sabbaths.getSabbathDetail] Fetching sabbath:", input.sabbathId);

    const { data: sabbath, error: sabbathError } = await db(ctx.supabase)
      .from("sabbaths")
      .select("*")
      .eq("id", input.sabbathId)
      .single();

    if (sabbathError || !sabbath) {
      console.error("[sabbaths.getSabbathDetail] Sabbath not found:", sabbathError);
      throw new Error("Sabbath not found");
    }

    const typedSabbath = sabbath as Sabbath;

    const { data: group } = await db(ctx.supabase)
      .from("groups")
      .select("id, name")
      .eq("id", typedSabbath.group_id)
      .single();

    const groupInfo: SabbathGroupInfo = group
      ? { id: group.id, name: group.name }
      : { id: typedSabbath.group_id, name: "Unknown Church" };

    const isAdmin = profile.role === "admin";
    const isPastor = await checkIsChurchPastor(
      ctx.supabase,
      user.id,
      typedSabbath.group_id
    );
    const isHomeChurch = profile.home_group_id === typedSabbath.group_id;
    const canManage = isAdmin || isPastor;

    const { data: assignmentsRaw } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .select("*")
      .eq("sabbath_id", input.sabbathId);

    let assignments: SabbathAssignment[] = [];
    const isAssignedUser =
      ((assignmentsRaw as any[]) ?? []).some(
        (a: any) => a.user_id === user.id
      );

    const shouldShowAssignments =
      typedSabbath.status === "published" ||
      (canManage && (typedSabbath.status === "draft" || typedSabbath.status === "cancelled"));

    if (shouldShowAssignments && assignmentsRaw) {
      const userIds = [
        ...new Set(
          (assignmentsRaw as any[])
            .flatMap((a: any) => [a.user_id, a.suggested_user_id])
            .filter(Boolean)
        ),
      ] as string[];

      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await db(ctx.supabase)
          .from("profiles")
          .select("id, full_name, display_name")
          .in("id", userIds);

        if (profiles) {
          for (const p of profiles as Array<{ id: string; full_name: string | null; display_name: string | null }>) {
            profileMap.set(p.id, p.display_name || p.full_name || "Unknown");
          }
        }
      }

      assignments = (assignmentsRaw as any[]).map((a: any) => ({
        ...a,
        user_name: a.user_id ? profileMap.get(a.user_id) ?? "Unknown" : undefined,
        suggested_user_name: a.suggested_user_id
          ? profileMap.get(a.suggested_user_id) ?? "Unknown"
          : undefined,
      }));
    }

    const shouldShowAttendees =
      isHomeChurch && typedSabbath.status === "published";

    let attendance: SabbathAttendance[] = [];
    if (shouldShowAttendees || canManage) {
      const { data: attendanceRaw } = await db(ctx.supabase)
        .from("sabbath_attendance")
        .select("*")
        .eq("sabbath_id", input.sabbathId);

      if (attendanceRaw) {
        const attendeeIds = (attendanceRaw as any[]).map((a: any) => a.user_id) as string[];
        let attendeeMap = new Map<string, string>();

        if (attendeeIds.length > 0) {
          const { data: attendeeProfiles } = await db(ctx.supabase)
            .from("profiles")
            .select("id, full_name, display_name")
            .in("id", attendeeIds);

          if (attendeeProfiles) {
            for (const p of attendeeProfiles as Array<{ id: string; full_name: string | null; display_name: string | null }>) {
              attendeeMap.set(
                p.id,
                p.display_name || p.full_name || "Unknown"
              );
            }
          }
        }

        attendance = (attendanceRaw as any[]).map((a: any) => ({
          ...a,
          user_name: attendeeMap.get(a.user_id) ?? "Unknown",
        }));
      }
    }

    const canRespondAttendance =
      typedSabbath.status === "published";

    const canRespondAssignment =
      typedSabbath.status === "published" && isAssignedUser;

    const detail: SabbathDetailView = {
      sabbath: typedSabbath,
      group: groupInfo,
      assignments,
      attendance,
      isHomeChurch,
      isAssignedUser,
      canManage,
      canRespondAttendance,
      canRespondAssignment,
      shouldShowAttendees,
      shouldShowAssignments,
    };

    console.log("[sabbaths.getSabbathDetail] Returning detail for:", input.sabbathId);
    return detail;
  });

const getMyUpcomingResponsibilities = publicProcedure.query(async ({ ctx }) => {
  const user = await getAuthenticatedUser(ctx);
  const profile = await getUserProfile(ctx.supabase, user.id);
  const today = getTodayDateString();

  console.log(
    "[sabbaths.getMyUpcomingResponsibilities] Fetching for user:",
    user.id
  );

  const { data: assignments, error } = await db(ctx.supabase)
    .from("sabbath_assignments")
    .select("*, sabbaths!inner(id, sabbath_date, group_id, status)")
    .eq("user_id", user.id)
    .gte("sabbaths.sabbath_date", today)
    .eq("sabbaths.status", "published");

  if (error) {
    console.error("[sabbaths.getMyUpcomingResponsibilities] Error:", error);
    throw new Error(error.message);
  }

  if (!assignments || assignments.length === 0) {
    return [] as UpcomingResponsibilityItem[];
  }

  const groupIds = [
    ...new Set(
      (assignments as any[]).map((a: any) => a.sabbaths.group_id)
    ),
  ] as string[];

  const { data: groups } = await db(ctx.supabase)
    .from("groups")
    .select("id, name")
    .in("id", groupIds);

  const groupMap = new Map<string, string>();
  if (groups) {
    for (const g of groups as Array<{ id: string; name: string }>) {
      groupMap.set(g.id, g.name);
    }
  }

  const items: UpcomingResponsibilityItem[] = (assignments as any[]).map(
    (a: any) => ({
      sabbath_id: a.sabbaths.id,
      sabbath_date: a.sabbaths.sabbath_date,
      group_id: a.sabbaths.group_id,
      group_name: groupMap.get(a.sabbaths.group_id) ?? "Unknown Church",
      role: a.role as SabbathRole,
      assignment_status: a.status as SabbathAssignmentStatus,
      is_home_church: profile.home_group_id === a.sabbaths.group_id,
    })
  );

  items.sort(
    (a, b) =>
      new Date(a.sabbath_date).getTime() - new Date(b.sabbath_date).getTime()
  );

  console.log(
    "[sabbaths.getMyUpcomingResponsibilities] Returning",
    items.length,
    "responsibilities"
  );
  return items;
});

// ─── MUTATIONS ─────────────────────────────────────────────

const createDraft = publicProcedure
  .input(
    z.object({
      groupId: z.string(),
      sabbathDate: z.string(),
      notes: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);
    await requireCanManageSabbath(ctx.supabase, user.id, input.groupId);

    const dateObj = new Date(input.sabbathDate);
    if (!isSaturday(dateObj)) {
      throw new Error("Sabbath date must be a Saturday");
    }

    console.log(
      "[sabbaths.createDraft] Creating draft for group:",
      input.groupId,
      "date:",
      input.sabbathDate
    );

    const { data: existing } = await db(ctx.supabase)
      .from("sabbaths")
      .select("id")
      .eq("group_id", input.groupId)
      .eq("sabbath_date", input.sabbathDate)
      .maybeSingle();

    if (existing) {
      throw new Error("A Sabbath already exists for this church on this date");
    }

    const { data: sabbath, error: insertError } = await db(ctx.supabase)
      .from("sabbaths")
      .insert({
        group_id: input.groupId,
        sabbath_date: input.sabbathDate,
        status: "draft",
        notes: input.notes ?? null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (insertError || !sabbath) {
      console.error("[sabbaths.createDraft] Error creating sabbath:", insertError);
      throw new Error(insertError?.message ?? "Failed to create Sabbath");
    }

    const assignmentRows = ALL_ROLES.map((role) => ({
      sabbath_id: (sabbath as any).id,
      role,
      user_id: null,
      status: "pending",
    }));

    const { error: assignError } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .insert(assignmentRows);

    if (assignError) {
      console.error(
        "[sabbaths.createDraft] Error creating assignment rows:",
        assignError
      );
      throw new Error(assignError.message);
    }

    console.log("[sabbaths.createDraft] Draft created:", (sabbath as any).id);
    return sabbath as Sabbath;
  });

const updateDraft = publicProcedure
  .input(
    z.object({
      sabbathId: z.string(),
      sabbathDate: z.string().optional(),
      notes: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: sabbath, error: fetchError } = await db(ctx.supabase)
      .from("sabbaths")
      .select("*")
      .eq("id", input.sabbathId)
      .single();

    if (fetchError || !sabbath) {
      throw new Error("Sabbath not found");
    }

    const typedSabbath = sabbath as Sabbath;

    if (typedSabbath.status !== "draft") {
      throw new Error("Only draft Sabbaths can be updated");
    }

    await requireCanManageSabbath(ctx.supabase, user.id, typedSabbath.group_id);

    const updateData: Record<string, any> = {
      updated_by: user.id,
    };

    if (input.sabbathDate !== undefined) {
      const dateObj = new Date(input.sabbathDate);
      if (!isSaturday(dateObj)) {
        throw new Error("Sabbath date must be a Saturday");
      }

      const { data: existing } = await db(ctx.supabase)
        .from("sabbaths")
        .select("id")
        .eq("group_id", typedSabbath.group_id)
        .eq("sabbath_date", input.sabbathDate)
        .neq("id", input.sabbathId)
        .maybeSingle();

      if (existing) {
        throw new Error(
          "A Sabbath already exists for this church on this date"
        );
      }

      updateData.sabbath_date = input.sabbathDate;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const { data: updated, error: updateError } = await db(ctx.supabase)
      .from("sabbaths")
      .update(updateData)
      .eq("id", input.sabbathId)
      .select()
      .single();

    if (updateError) {
      console.error("[sabbaths.updateDraft] Error:", updateError);
      throw new Error(updateError.message);
    }

    console.log("[sabbaths.updateDraft] Updated:", input.sabbathId);
    return updated as Sabbath;
  });

const assignRole = publicProcedure
  .input(
    z.object({
      sabbathId: z.string(),
      role: sabbathRoleEnum,
      userId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: sabbath } = await db(ctx.supabase)
      .from("sabbaths")
      .select("group_id, status")
      .eq("id", input.sabbathId)
      .single();

    if (!sabbath) {
      throw new Error("Sabbath not found");
    }

    await requireCanManageSabbath(ctx.supabase, user.id, (sabbath as any).group_id);

    const { data: assignment, error } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .update({
        user_id: input.userId,
        status: "pending",
        decline_reason: null,
        suggested_user_id: null,
      })
      .eq("sabbath_id", input.sabbathId)
      .eq("role", input.role)
      .select()
      .single();

    if (error) {
      console.error("[sabbaths.assignRole] Error:", error);
      throw new Error(error.message);
    }

    console.log(
      "[sabbaths.assignRole] Assigned user",
      input.userId,
      "to role",
      input.role
    );
    return assignment as SabbathAssignment;
  });

const reassignRole = publicProcedure
  .input(
    z.object({
      sabbathId: z.string(),
      role: sabbathRoleEnum,
      newUserId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: sabbath } = await db(ctx.supabase)
      .from("sabbaths")
      .select("group_id, status")
      .eq("id", input.sabbathId)
      .single();

    if (!sabbath) {
      throw new Error("Sabbath not found");
    }

    await requireCanManageSabbath(ctx.supabase, user.id, (sabbath as any).group_id);

    const { data: assignment, error } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .update({
        user_id: input.newUserId,
        status: "reassigned",
        decline_reason: null,
        suggested_user_id: null,
      })
      .eq("sabbath_id", input.sabbathId)
      .eq("role", input.role)
      .select()
      .single();

    if (error) {
      console.error("[sabbaths.reassignRole] Error:", error);
      throw new Error(error.message);
    }

    console.log(
      "[sabbaths.reassignRole] Reassigned role",
      input.role,
      "to user",
      input.newUserId
    );
    return assignment as SabbathAssignment;
  });

const publish = publicProcedure
  .input(z.object({ sabbathId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: sabbath } = await db(ctx.supabase)
      .from("sabbaths")
      .select("*")
      .eq("id", input.sabbathId)
      .single();

    if (!sabbath) {
      throw new Error("Sabbath not found");
    }

    const typedSabbath = sabbath as Sabbath;

    if (typedSabbath.status !== "draft") {
      throw new Error("Only draft Sabbaths can be published");
    }

    await requireCanManageSabbath(ctx.supabase, user.id, typedSabbath.group_id);

    const { data: updated, error } = await db(ctx.supabase)
      .from("sabbaths")
      .update({
        status: "published",
        published_by: user.id,
        published_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", input.sabbathId)
      .select()
      .single();

    if (error) {
      console.error("[sabbaths.publish] Error:", error);
      throw new Error(error.message);
    }

    // TODO: Trigger notification to assigned users and home church members
    console.log("[sabbaths.publish] Published sabbath:", input.sabbathId);
    return updated as Sabbath;
  });

const cancel = publicProcedure
  .input(
    z.object({
      sabbathId: z.string(),
      cancellationReason: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: sabbath } = await db(ctx.supabase)
      .from("sabbaths")
      .select("*")
      .eq("id", input.sabbathId)
      .single();

    if (!sabbath) {
      throw new Error("Sabbath not found");
    }

    const typedSabbath = sabbath as Sabbath;

    if (typedSabbath.status === "cancelled") {
      throw new Error("Sabbath is already cancelled");
    }

    await requireCanManageSabbath(ctx.supabase, user.id, typedSabbath.group_id);

    const { data: updated, error } = await db(ctx.supabase)
      .from("sabbaths")
      .update({
        status: "cancelled",
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: input.cancellationReason ?? null,
        updated_by: user.id,
      })
      .eq("id", input.sabbathId)
      .select()
      .single();

    if (error) {
      console.error("[sabbaths.cancel] Error:", error);
      throw new Error(error.message);
    }

    // TODO: Trigger notification to assigned users and home church members about cancellation
    console.log("[sabbaths.cancel] Cancelled sabbath:", input.sabbathId);
    return updated as Sabbath;
  });

const respondAttendance = publicProcedure
  .input(
    z.object({
      sabbathId: z.string(),
      status: sabbathAttendanceStatusEnum,
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);
    const profile = await getUserProfile(ctx.supabase, user.id);

    const { data: sabbath } = await db(ctx.supabase)
      .from("sabbaths")
      .select("id, group_id, status")
      .eq("id", input.sabbathId)
      .single();

    if (!sabbath) {
      throw new Error("Sabbath not found");
    }

    const typedSabbath = sabbath as { id: string; group_id: string; status: string };

    if (typedSabbath.status !== "published") {
      throw new Error("Can only respond to published Sabbaths");
    }

    const isHomeChurch = profile.home_group_id === typedSabbath.group_id;

    if (!isHomeChurch && input.status === "not_attending") {
      throw new Error(
        "Only home church members can mark as not attending. Other churches can only mark as attending."
      );
    }

    console.log(
      "[sabbaths.respondAttendance] User",
      user.id,
      "responding",
      input.status,
      "for sabbath",
      input.sabbathId
    );

    const { data: existing } = await db(ctx.supabase)
      .from("sabbath_attendance")
      .select("id")
      .eq("sabbath_id", input.sabbathId)
      .eq("user_id", user.id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await db(ctx.supabase)
        .from("sabbath_attendance")
        .update({ status: input.status })
        .eq("id", (existing as any).id)
        .select()
        .single();

      if (error) {
        console.error("[sabbaths.respondAttendance] Update error:", error);
        throw new Error(error.message);
      }
      result = data;
    } else {
      const { data, error } = await db(ctx.supabase)
        .from("sabbath_attendance")
        .insert({
          sabbath_id: input.sabbathId,
          user_id: user.id,
          status: input.status,
        })
        .select()
        .single();

      if (error) {
        console.error("[sabbaths.respondAttendance] Insert error:", error);
        throw new Error(error.message);
      }
      result = data;
    }

    return result as SabbathAttendance;
  });

const acceptAssignment = publicProcedure
  .input(z.object({ assignmentId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: assignment, error: fetchError } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .select("*, sabbaths!inner(status)")
      .eq("id", input.assignmentId)
      .single();

    if (fetchError || !assignment) {
      throw new Error("Assignment not found");
    }

    const typedAssignment = assignment as any;

    if (typedAssignment.user_id !== user.id) {
      throw new Error("You can only accept your own assignment");
    }

    if (typedAssignment.sabbaths.status !== "published") {
      throw new Error("Can only accept assignments for published Sabbaths");
    }

    if (typedAssignment.status !== "pending") {
      throw new Error("Can only accept pending assignments");
    }

    const { data: updated, error } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .update({ status: "accepted" })
      .eq("id", input.assignmentId)
      .select()
      .single();

    if (error) {
      console.error("[sabbaths.acceptAssignment] Error:", error);
      throw new Error(error.message);
    }

    console.log("[sabbaths.acceptAssignment] Accepted:", input.assignmentId);
    return updated as SabbathAssignment;
  });

const declineAssignment = publicProcedure
  .input(
    z.object({
      assignmentId: z.string(),
      reason: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: assignment, error: fetchError } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .select("*, sabbaths!inner(status)")
      .eq("id", input.assignmentId)
      .single();

    if (fetchError || !assignment) {
      throw new Error("Assignment not found");
    }

    const typedAssignment = assignment as any;

    if (typedAssignment.user_id !== user.id) {
      throw new Error("You can only decline your own assignment");
    }

    if (typedAssignment.sabbaths.status !== "published") {
      throw new Error("Can only decline assignments for published Sabbaths");
    }

    if (typedAssignment.status !== "pending" && typedAssignment.status !== "accepted") {
      throw new Error("Can only decline pending or accepted assignments");
    }

    const { data: updated, error } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .update({
        status: "declined",
        decline_reason: input.reason ?? null,
      })
      .eq("id", input.assignmentId)
      .select()
      .single();

    if (error) {
      console.error("[sabbaths.declineAssignment] Error:", error);
      throw new Error(error.message);
    }

    // TODO: Trigger notification to pastors about declined assignment
    console.log("[sabbaths.declineAssignment] Declined:", input.assignmentId);
    return updated as SabbathAssignment;
  });

const suggestReplacement = publicProcedure
  .input(
    z.object({
      assignmentId: z.string(),
      suggestedUserId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getAuthenticatedUser(ctx);

    const { data: assignment, error: fetchError } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .select("*, sabbaths!inner(status)")
      .eq("id", input.assignmentId)
      .single();

    if (fetchError || !assignment) {
      throw new Error("Assignment not found");
    }

    const typedAssignment = assignment as any;

    if (typedAssignment.user_id !== user.id) {
      throw new Error("You can only suggest a replacement for your own assignment");
    }

    if (typedAssignment.sabbaths.status !== "published") {
      throw new Error(
        "Can only suggest replacements for published Sabbaths"
      );
    }

    if (
      typedAssignment.status !== "pending" &&
      typedAssignment.status !== "accepted" &&
      typedAssignment.status !== "declined"
    ) {
      throw new Error("Cannot suggest replacement for this assignment status");
    }

    const { data: updated, error } = await db(ctx.supabase)
      .from("sabbath_assignments")
      .update({
        status: "replacement_suggested",
        suggested_user_id: input.suggestedUserId,
      })
      .eq("id", input.assignmentId)
      .select()
      .single();

    if (error) {
      console.error("[sabbaths.suggestReplacement] Error:", error);
      throw new Error(error.message);
    }

    // TODO: Trigger notification to pastors about replacement suggestion
    console.log(
      "[sabbaths.suggestReplacement] Suggested replacement for:",
      input.assignmentId
    );
    return updated as SabbathAssignment;
  });

// ─── ROUTER ────────────────────────────────────────────────

export const sabbathsRouter = createTRPCRouter({
  getMyChurchUpcoming,
  getSwitzerlandUpcomingByDate,
  getSabbathDetail,
  getMyUpcomingResponsibilities,
  createDraft,
  updateDraft,
  assignRole,
  reassignRole,
  publish,
  cancel,
  respondAttendance,
  acceptAssignment,
  declineAssignment,
  suggestReplacement,
});

export default sabbathsRouter;
