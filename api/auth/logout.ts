import { SESSION_COOKIE_NAME } from '../_constants';
import { HTTP_STATUS_OK, HttpHeaderContentType, JsonResponseMimeType } from '../../shared/config';
import { serialize } from 'cookie';

export default async function handler() {
  const cookie = serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'lax',
    expires: new Date(0), // Expire immediately
  });

  return new Response(JSON.stringify({ success: true }), {
    status: HTTP_STATUS_OK,
    headers: {
      [HttpHeaderContentType]: JsonResponseMimeType,
      'Set-Cookie': cookie,
    },
  });
}
