import { SignJWT } from 'jose';

// This interface is a simple stand-in for a full serverless platform's Request object.
interface ServerlessRequest {
  json: () => Promise<{ code: string }>;
}

export default async function handler(request: ServerlessRequest) {
  const { code } = await request.json();

  if (!code) {
    return new Response(JSON.stringify({ error: 'No code provided.' }), { status: 400 });
  }

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const JWT_SECRET = process.env.JWT_SECRET; // A new, required secret

  if (!JWT_SECRET) {
    return new Response(JSON.stringify({ error: 'JWT_SECRET environment variable is not set.' }), { status: 500 });
  }

  try {
    // Step 1: Exchange the code for an access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description);
    }
    const accessToken = tokenData.access_token;

    // Step 2: Use the access token to get the user's profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();
    
    const userProfile = {
      id: userData.id,
      name: userData.name || userData.login,
      email: userData.email,
      avatarUrl: userData.avatar_url,
    };

    // Step 3: Create a secure JWT
    const secret = new TextEncoder().encode(JWT_SECRET);
    const jwt = await new SignJWT(userProfile)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);
    
    const cookie = `session=${jwt}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=2592000`; // Max-Age = 30 days

    // Step 4: Return the user profile and set the JWT cookie
    return new Response(JSON.stringify(userProfile), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed.';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}