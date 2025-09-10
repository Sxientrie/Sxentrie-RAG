import { SESSION_COOKIE_NAME, EXPIRED_COOKIE_DATE } from '../_constants';
import { HTTP_STATUS_OK } from '../../shared/config';
export default async function handler() {
  const cookie = `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; Path=/; SameSite=Lax; Expires=${EXPIRED_COOKIE_DATE}`;
  return new Response(JSON.stringify({ success: true }), {
      status: HTTP_STATUS_OK,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
}
