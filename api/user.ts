import { jwtVerify } from 'jose';
import { SESSION_COOKIE_NAME } from './_constants';
import {
    HTTP_STATUS_OK, HTTP_STATUS_UNAUTHORIZED, HTTP_STATUS_INTERNAL_SERVER_ERROR, ErrorConfig,
    HttpHeaderCookie, ErrorNotAuthenticated, Semicolon, Equals,
    ErrorInvalidSession, HttpHeaderContentType, JsonResponseMimeType
} from '../shared/config';
interface ServerlessRequest {
  headers: { get: (headerName: string) => string | null };
}
export default async function handler(request: ServerlessRequest) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return new Response(JSON.stringify({ error: ErrorConfig }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }
  const cookieHeader = request.headers.get(HttpHeaderCookie);
  if (!cookieHeader) {
    return new Response(JSON.stringify({ error: ErrorNotAuthenticated }), { status: HTTP_STATUS_UNAUTHORIZED });
  }
  const cookies = Object.fromEntries(
    cookieHeader.split(Semicolon).map(c => {
      const trimmedCookie = c.trim();
      const eqIndex = trimmedCookie.indexOf(Equals);
      if (eqIndex === -1) {
        return [trimmedCookie, ''];
      }
      const key = trimmedCookie.substring(0, eqIndex);
      const value = trimmedCookie.substring(eqIndex + 1);
      return [key, value];
    })
  );
  const sessionJwt = cookies[SESSION_COOKIE_NAME];
  if (!sessionJwt) {
    return new Response(JSON.stringify({ error: ErrorNotAuthenticated }), { status: HTTP_STATUS_UNAUTHORIZED });
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionJwt, secret);
    return new Response(JSON.stringify(payload), {
      status: HTTP_STATUS_OK,
      headers: { [HttpHeaderContentType]: JsonResponseMimeType },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: ErrorInvalidSession }), { status: HTTP_STATUS_UNAUTHORIZED });
  }
}