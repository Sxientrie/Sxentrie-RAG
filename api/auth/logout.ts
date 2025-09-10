import { SESSION_COOKIE_NAME, EXPIRED_COOKIE_DATE } from '../_constants';
import { HTTP_STATUS_OK, CookieAttributesWithExpires, HttpHeaderContentType, JsonResponseMimeType } from '../../shared/config';
export default async function handler() {
  const cookie = `${SESSION_COOKIE_NAME}=; ${CookieAttributesWithExpires}${EXPIRED_COOKIE_DATE}`;
  return new Response(JSON.stringify({ success: true }), {
      status: HTTP_STATUS_OK,
      headers: {
        [HttpHeaderContentType]: JsonResponseMimeType,
        'Set-Cookie': cookie,
      },
    });
}
