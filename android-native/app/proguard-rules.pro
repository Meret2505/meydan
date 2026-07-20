# Release builds run R8 with shrinking enabled.
#
# Retrofit/kotlinx.serialization rules are added alongside those dependencies
# so each rule arrives with the library that needs it, rather than as a block
# of pre-emptive keeps nobody can later attribute.
