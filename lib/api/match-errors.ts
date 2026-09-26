import { badRequest, conflict, forbidden, notFound, ApiError } from "@/lib/api/errors";
import type { MatchError } from "@/lib/services/matches";

/**
 * One place to turn a match service error into an HTTP one.
 *
 * Four routes answer with the same union, and spelling the mapping out in
 * each of them is how two of them end up disagreeing about what a 403 means.
 */
export function matchApiError(error: MatchError): ApiError {
  switch (error) {
    case "not_found":
      return notFound("game_not_found");
    case "not_captain":
      return forbidden("not_captain");
    case "not_a_match":
      // The caller aimed a match action at an ordinary game. From their side
      // that route simply has nothing there.
      return notFound("game_not_found");
    case "roster_too_small":
      return conflict("roster_too_small");
    case "same_team":
      return conflict("same_team");
    case "already_answered":
      return conflict("already_answered");
    case "already_taken":
      return conflict("already_taken");
    case "match_in_past":
      return badRequest("game_in_past");
    case "invalid_input":
      return badRequest();
  }
}
