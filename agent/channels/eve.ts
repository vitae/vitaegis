import { timingSafeEqual } from 'node:crypto';
import { eveChannel } from 'eve/channels/eve';
import { localDev, vercelOidc, withAuthChallenges, type AuthFn } from 'eve/channels/auth';

/**
 * Route auth for the agent's HTTP surface. The operator authenticates the same way the rest
 * of /admin does: the CONTENT_ADMIN_KEY env var, sent as an `x-admin-key` header. There are no
 * accounts; whoever holds the key is the operator.
 */
function adminKey(): AuthFn<Request> {
  return withAuthChallenges(
    (request) => {
      const expected = process.env.CONTENT_ADMIN_KEY;
      const sent = request.headers.get('x-admin-key');
      if (!expected || !sent) return null;
      const a = Buffer.from(expected);
      const b = Buffer.from(sent);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      return {
        authenticator: 'vitaegis-admin',
        principalId: 'operator',
        principalType: 'user',
        attributes: { role: 'admin' },
      };
    },
    [{ scheme: 'Bearer' }],
  );
}

export default eveChannel({
  auth: [adminKey(), vercelOidc(), localDev()],
});
