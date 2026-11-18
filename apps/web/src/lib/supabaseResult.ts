// Supabase calls resolve with { data, error } instead of throwing. unwrap()
// turns that into the usual throw-or-return so callers don't repeat
// `if (error) throw error`.
export interface SupabaseResult {
  data?: unknown;
  error: Error | null;
}

// The data type of the success branch of a Supabase response. Failure branches
// carry nulls in `data`, which this leaves out so callers get the real type.
type SuccessData<R extends SupabaseResult> = Extract<R, { error: null }> extends {
  data: infer D;
}
  ? D
  : undefined;

export function unwrap<R extends SupabaseResult>(result: R): SuccessData<R> {
  if (result.error) throw result.error;
  return result.data as SuccessData<R>;
}
