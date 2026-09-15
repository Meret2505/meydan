import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { DISTRICTS, SURFACES } from "@/lib/data";
import { storage } from "@/lib/storage";
import { extFor, validate, type UploadInput } from "@/lib/services/uploads";

/**
 * Player-submitted fields, held in `field_submissions` for admin review
 * before becoming a real `Field` row (see the schema comment on
 * FieldSubmission for why this is a separate table rather than a status
 * column on Field).
 *
 * Shared by the mobile API and — eventually — a web submission form, so all
 * validation lives here rather than in a route handler.
 */

const MIN_PENDING_CAPACITY = 4;
const MAX_PENDING_CAPACITY = 40;
const MAX_PENDING_PER_USER = 3;
const MAX_SUBMISSION_PHOTOS = 3;

export type CreateSubmissionInput = {
  name: string;
  address: string;
  district: string;
  surface: string;
  capacity: number;
  phone?: string | null;
  description?: string | null;
};

export type CreateSubmissionResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: "invalid_input" | "too_many_pending" | "rate_limited" };

/** Trims and validates the create-submission form; see the field table in the feature plan. */
function normalizeCreateInput(
  input: CreateSubmissionInput,
): { name: string; address: string; phone: string | null; description: string | null } | null {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) return null;

  const address = input.address.trim();
  if (address.length < 4 || address.length > 200) return null;

  if (!(DISTRICTS as readonly string[]).includes(input.district)) return null;
  if (!(SURFACES as readonly string[]).includes(input.surface)) return null;

  if (
    !Number.isInteger(input.capacity) ||
    input.capacity < MIN_PENDING_CAPACITY ||
    input.capacity > MAX_PENDING_CAPACITY
  ) {
    return null;
  }

  let phone: string | null = null;
  if (input.phone != null && input.phone !== "") {
    phone = normalizePhone(input.phone);
    if (!phone) return null;
  }

  const description = input.description?.trim() || null;
  if (description && description.length > 500) return null;

  return { name, address, phone, description };
}

/** Submits a new field for review. Rate-limited and capped per user so the queue can't be flooded. */
export async function createFieldSubmission(
  userId: string,
  input: CreateSubmissionInput,
): Promise<CreateSubmissionResult> {
  const normalized = normalizeCreateInput(input);
  if (!normalized) return { ok: false, error: "invalid_input" };

  // 10 submissions per user per day — generous for a real report, caps abuse.
  const limit = await rateLimit(`field-submission:${userId}`, 10, 24 * 60 * 60_000);
  if (!limit.allowed) return { ok: false, error: "rate_limited" };

  const pendingCount = await prisma.fieldSubmission.count({
    where: { submittedById: userId, status: "PENDING" },
  });
  if (pendingCount >= MAX_PENDING_PER_USER) {
    return { ok: false, error: "too_many_pending" };
  }

  const submission = await prisma.fieldSubmission.create({
    data: {
      submittedById: userId,
      name: normalized.name,
      address: normalized.address,
      district: input.district,
      surface: input.surface,
      capacity: input.capacity,
      phone: normalized.phone,
      description: normalized.description,
    },
  });

  return { ok: true, submissionId: submission.id };
}

export type AddPhotoError =
  | "invalid_file"
  | "too_large"
  | "unsupported_type"
  | "forbidden"
  | "not_found"
  | "too_many_photos"
  | "storage_failed";

export type AddPhotoResult = { ok: true; photos: string[] } | { ok: false; error: AddPhotoError };

/**
 * Attaches a photo to a PENDING submission. Author-only and PENDING-only:
 * once reviewed, the submission is either a real Field (author has no further
 * write path to it) or rejected (resubmit as a new one).
 *
 * Stored in the same "field-photos" bucket a Field's own photos live in, so
 * approval can carry the URLs across verbatim with no copy.
 */
export async function addSubmissionPhoto(
  userId: string,
  submissionId: string,
  input: UploadInput,
): Promise<AddPhotoResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const submission = await prisma.fieldSubmission.findUnique({
    where: { id: submissionId },
    select: { submittedById: true, status: true, photos: true },
  });
  if (!submission) return { ok: false, error: "not_found" };
  if (submission.submittedById !== userId || submission.status !== "PENDING") {
    return { ok: false, error: "forbidden" };
  }
  if (submission.photos.length >= MAX_SUBMISSION_PHOTOS) {
    return { ok: false, error: "too_many_photos" };
  }

  const ext = extFor(input.filename, input.mime);
  const path = `submissions/${submissionId}/${Date.now()}-${randomUUID()}.${ext}`;

  let publicUrl: string;
  try {
    publicUrl = await storage.put("field-photos", path, input.bytes, input.mime);
  } catch (e) {
    console.warn("[field-submission] photo upload failed:", (e as Error).message);
    return { ok: false, error: "storage_failed" };
  }

  const updated = await prisma.fieldSubmission.update({
    where: { id: submissionId },
    data: { photos: { push: publicUrl } },
    select: { photos: true },
  });

  return { ok: true, photos: updated.photos };
}

/**
 * The moderation queue: PENDING submissions only, oldest first — a fair
 * queue, not a feed. Approved/rejected submissions don't reappear here; the
 * author's only feedback is the notification (see Out of scope in the plan).
 */
export async function listPendingSubmissions() {
  return prisma.fieldSubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { submittedBy: true },
  });
}

export type ReviewError = "not_found" | "already_reviewed";

export type ApproveResult = { ok: true; fieldId: string } | { ok: false; error: ReviewError };

/**
 * Approves a submission: creates the real Field row, stamps the review, and
 * notifies the author. One transaction so the two writes and the
 * notification can never land only partially.
 *
 * Turkmen translation and richer metadata (hours, amenities, coordinates) are
 * intentionally left for Meret to add on the Field afterwards — see Out of
 * scope in the feature plan.
 */
export async function approveFieldSubmission(
  adminId: string,
  submissionId: string,
): Promise<ApproveResult> {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.fieldSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) return { ok: false as const, error: "not_found" as const };
    if (submission.status !== "PENDING") {
      return { ok: false as const, error: "already_reviewed" as const };
    }

    const field = await tx.field.create({
      data: {
        name: submission.name,
        nameRu: submission.name,
        address: submission.address,
        addressRu: submission.address,
        bodyRu: submission.description,
        district: submission.district,
        surface: submission.surface,
        capacity: submission.capacity,
        phone: submission.phone,
        // Already absolute storage URLs (see addSubmissionPhoto) — carried
        // across verbatim, no re-upload.
        image: submission.photos[0] ?? null,
        photos: submission.photos,
        isActive: true,
      },
    });

    await tx.fieldSubmission.update({
      where: { id: submissionId },
      data: {
        status: "APPROVED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        fieldId: field.id,
      },
    });

    await tx.notification.create({
      data: {
        userId: submission.submittedById,
        type: "FIELD_APPROVED",
        title: "Поле одобрено",
        body: `Твоё поле «${submission.name}» теперь в списке полей.`,
        data: { fieldId: field.id },
      },
    });

    return { ok: true as const, fieldId: field.id };
  });
}

export type RejectResult = { ok: true } | { ok: false; error: ReviewError };

export async function rejectFieldSubmission(
  adminId: string,
  submissionId: string,
  reason?: string | null,
): Promise<RejectResult> {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.fieldSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) return { ok: false as const, error: "not_found" as const };
    if (submission.status !== "PENDING") {
      return { ok: false as const, error: "already_reviewed" as const };
    }

    await tx.fieldSubmission.update({
      where: { id: submissionId },
      data: {
        status: "REJECTED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason?.trim() || null,
      },
    });

    await tx.notification.create({
      data: {
        userId: submission.submittedById,
        type: "FIELD_REJECTED",
        title: "Поле отклонено",
        body: reason?.trim()
          ? `Заявка «${submission.name}» отклонена: ${reason.trim()}`
          : `Заявка «${submission.name}» отклонена.`,
        data: {},
      },
    });

    return { ok: true as const };
  });
}
