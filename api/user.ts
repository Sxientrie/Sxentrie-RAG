import { jwtVerify } from 'jose';
import { HTTP_STATUS_OK, HTTP_STATUS_UNAUTHORIZED, HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../shared/config';
interface ServerlessRequest {
  headers: { get: (headerName: string) => string | null };
}
export default async function handler(request: ServerlessRequest) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return new Response(JSON.stringify({ error: 'Configuration error' }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: HTTP_STATUS_UNAUTHORIZED });
  }
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
    const parts = c.trim().split('=', 2);
    return [parts[0], parts[1] || ''];
  }));
  const sessionJwt = cookies.session;
  if (!sessionJwt) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: HTTP_STATUS_UNAUTHORIZED });
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionJwt, secret);
    return new Response(JSON.stringify(payload), {
      status: HTTP_STATUS_OK,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: HTTP_STATUS_UNAUTHORIZED });
  }
}
