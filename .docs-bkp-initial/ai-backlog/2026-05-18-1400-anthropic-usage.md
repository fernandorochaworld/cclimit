# Validate the usage API response shape

`AnthropicUsageProvider.fetchUsage` casts the JSON response to `Usage` with
`as Usage` — there is no runtime validation. If the endpoint changes its
shape, the CLI fails with confusing errors instead of a clear message.

Suggestion: add a small runtime validator (e.g. a hand-written guard or a
schema library like `zod`) that parses the response and throws a clear
error when the payload does not match the expected `Usage` type.
