import { badRequest, conflict, forbidden, notFound, ApiError } from "@/lib/api/errors";
import type { MatchResultError } from "@/lib/services/match-result";

/** One mapping shared by the three score routes. */
export function matchResultApiError(error: MatchResultError): ApiError {
  switch (error) {
    case "not_found":
    case "not_a_match":
      return notFound("game_not_found");
    case "not_captain":
      return forbidden("not_captain");
    case "cannot_answer_own_report":
      return forbidden("cannot_answer_own_report");
    case "already_confirmed":
      return conflict("already_confirmed");
    case "no_score_reported":
      return conflict("no_score_reported");
    case "not_played":
      return badRequest("game_not_played");
    case "invalid_input":
      return badRequest();
  }
}
