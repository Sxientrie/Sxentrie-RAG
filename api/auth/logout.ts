// This interface is a simple stand-in for a full serverless platform's Request and Response objects.
interface ServerlessResponse {
    headers: { set: (headerName: string, value: string) => void };
    json: (body: any) => any;
}

export default async function handler(req: any, res: ServerlessResponse) {
  // The key is to set the same cookie with an expiration date in the past.
  const cookie = `session=; HttpOnly; Secure; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

  return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
}
