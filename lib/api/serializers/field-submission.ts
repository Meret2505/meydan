import type { FieldSubmission, FieldSubmissionStatus, User } from "@prisma/client";
import { absoluteImageUrl } from "@/lib/api/images";
import { toPublicUserDto, type PublicUserDto } from "@/lib/api/serializers/user";

/** A pending field submission as the admin moderation screen renders it. */
export interface FieldSubmissionDto {
  id: string;
  name: string;
  address: string;
  district: string;
  surface: string;
  capacity: number;
  phone: string | null;
  description: string | null;
  photos: string[];
  status: FieldSubmissionStatus;
  createdAt: string;
  submittedBy: PublicUserDto;
}

export function toFieldSubmissionDto(
  submission: FieldSubmission & { submittedBy: User },
  origin: string,
): FieldSubmissionDto {
  return {
    id: submission.id,
    name: submission.name,
    address: submission.address,
    district: submission.district,
    surface: submission.surface,
    capacity: submission.capacity,
    phone: submission.phone,
    description: submission.description,
    // Already proxied by toProxyUrl at upload time; absoluteImageUrl only
    // needs to add the origin here, same as the Field serializers.
    photos: submission.photos
      .map((p) => absoluteImageUrl(p, origin))
      .filter((p): p is string => p != null),
    status: submission.status,
    createdAt: submission.createdAt.toISOString(),
    submittedBy: toPublicUserDto(submission.submittedBy, origin),
  };
}
