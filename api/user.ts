import { jwtVerify } from 'jose';

// This interface is a simple stand-in for a full serverless platform's Request object.
interface ServerlessRequest {
  headers: { get: (headerName: string) => string | null };
}

export default async function handler(request: ServerlessRequest) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return new Response(JSON.stringify({ error: 'Configuration error' }), { status: 500 });
  }

  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // A simple cookie parser
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
    const parts = c.trim().split('=', 2);
    return [parts[0], parts[1] || '']; // Ensure a value is always present
  }));
  const sessionJwt = cookies.session;

  if (!sessionJwt) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionJwt, secret);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // This will catch invalid/expired JWTs
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
  }
}
