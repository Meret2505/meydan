# Release builds run R8 with shrinking enabled.
#
# Retrofit/kotlinx.serialization rules are added alongside those dependencies
# so each rule arrives with the library that needs it, rather than as a block
# of pre-emptive keeps nobody can later attribute.

# Retrofit chooses its converter from a method's generic return type, so the
# DTO in `Response<ApiResponse<T>>` has to survive shrinking even when no code
# ever reads a field off it. Four of them did not: the avatar URL, the approve
# -submission payload, the disband result and the FCM token request are all
# write-only from the app's side, so R8 deleted the classes and rewrote the
# signatures to `ApiResponse<Object>`. kotlinx.serialization has no serializer
# for Object and threw before the request went out, which `apiCall` could only
# report as NetworkError — release builds showed "no connection" for calls that
# never left the phone, while debug builds were fine.
#
# Keeping the whole package rules out the entire class of failure, but it is
# not free, and an earlier version of this comment guessed wrong about the
# price. Measured with `apkanalyzer dex packages --defined-only`:
# com.meydan.app.core.network.dto is 1,732 methods / 141,080 bytes of a
# 3,333,885-byte dex — 4.2% — because `{ *; }` also retains every generated
# componentN, copy$default, equals, hashCode and toString from 546 lines of
# data classes. Every other com.meydan class survives as 609 bytes under this
# name, the rest having been repackaged.
#
# Only four DTOs were ever at risk (the ones no code reads a field from), so
# this can be narrowed to keep the classes without their generated members.
# Left broad for now because R8KeepsDtosTest reads usage.txt and will fail the
# moment a DTO is shrunk out again, which makes narrowing a safe, verifiable
# follow-up rather than a guess.
-keep class com.meydan.app.core.network.dto.** { *; }
