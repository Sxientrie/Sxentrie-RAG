
export default async function handler() {
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
