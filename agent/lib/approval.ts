import type { ApprovalPolicy } from 'eve/tools/approval';

/**
 * Approval policies shared by authored tools and MCP connections.
 *
 * The rule: reads run freely, writes pause for a person. A scheduled run has no person, so a
 * write there is denied with a reason the model can act on, instead of failing the session.
 */

/** Remote tool names whose effect is a read. Matched against the bare name, case-insensitive. */
const READ_PREFIXES = [
  'list_',
  'get_',
  'retrieve_',
  'search_',
  'fetch_',
  'read_',
  'describe_',
  'query_',
  'count_',
  'export_',
];

/** `stripe__create_product` → `create_product`. */
export function bareToolName(qualified: string): string {
  const i = qualified.indexOf('__');
  return i === -1 ? qualified : qualified.slice(i + 2);
}

export function isReadToolName(qualified: string, extraReads: string[] = []): boolean {
  const name = bareToolName(qualified).toLowerCase();
  if (extraReads.includes(name)) return true;
  return READ_PREFIXES.some((p) => name.startsWith(p));
}

/** The principal eve schedules run as: markdown schedules and `run` handlers passing `appAuth`. */
export function isAppPrincipal(
  auth: { authenticator?: string; principalId?: string; principalType?: string } | null | undefined,
): boolean {
  return (
    auth?.authenticator === 'app' &&
    auth.principalId === 'eve:app' &&
    auth.principalType === 'runtime'
  );
}

const SCHEDULED_DENIAL =
  'Scheduled runs cannot publish, charge, or change accounts. Queue the work and leave the decision for the operator.';

/**
 * A write that must be signed off by a person. Returns `user-approval` for a human caller and
 * a typed denial for the app principal.
 */
export const gated: ApprovalPolicy = ({ session }) =>
  isAppPrincipal(session.auth.current)
    ? { type: 'denied', reason: SCHEDULED_DENIAL }
    : 'user-approval';

/**
 * Per-connection policy: reads pass, anything else goes through `gated`.
 * `extraReads` names bare tools that are reads despite their prefix (e.g. `execute_sql` on a
 * read-only Supabase connection).
 */
export function gateWrites(extraReads: string[] = []): ApprovalPolicy {
  return (ctx) => {
    if (isReadToolName(ctx.toolName, extraReads)) return 'not-applicable';
    return gated(ctx);
  };
}
