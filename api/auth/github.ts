import { SignJWT } from 'jose';
import { JWT_EXPIRATION_TIME, JWT_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from '../_constants';
import { serialize } from 'cookie';
import {
  HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_INTERNAL_SERVER_ERROR, ErrorNoCodeProvided,
  ErrorJwtSecretNotSet, GitHubAccessTokenUrl, HttpMethodPost, HttpHeaderContentType, HttpHeaderAccept,
  JsonResponseMimeType, GitHubUserApiUrl, HttpHeaderAuthorization, AuthBearerPrefix, JwtAlgorithmHS256,
  CookieAttributes, ErrorAuthFailed, HttpHeaderContentTypeJsonUtf8
} from '../../shared/config';
interface ServerlessRequest {
  json: () => Promise<{ code: string }>;
}
interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}
interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}
export default async function handler(request: ServerlessRequest) {
  const { code } = await request.json();
  if (!code) {
    return new Response(JSON.stringify({ error: ErrorNoCodeProvided }), { status: HTTP_STATUS_BAD_REQUEST });
  }
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return new Response(JSON.stringify({ error: ErrorJwtSecretNotSet }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }
  try {
    const tokenResponse = await fetch(GitHubAccessTokenUrl, {
      method: HttpMethodPost,
      headers: {
        [HttpHeaderContentType]: JsonResponseMimeType,
        [HttpHeaderAccept]: JsonResponseMimeType,
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData: GitHubTokenResponse = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description);
    }
    const accessToken = tokenData.access_token;
    const userResponse = await fetch(GitHubUserApiUrl, {
      headers: {
        [HttpHeaderAuthorization]: `${AuthBearerPrefix}${accessToken}`,
      },
    });
    const userData: GitHubUserResponse = await userResponse.json();
    const userProfile = {
      id: userData.id.toString(),
      name: userData.name || userData.login,
      email: userData.email,
      avatarUrl: userData.avatar_url,
    };
    const secret = new TextEncoder().encode(JWT_SECRET);
    const jwt = await new SignJWT(userProfile)
      .setProtectedHeader({ alg: JwtAlgorithmHS256 })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION_TIME)
      .sign(secret);

    const cookie = serialize(SESSION_COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
      maxAge: JWT_MAX_AGE_SECONDS,
    });

    return new Response(JSON.stringify(userProfile), {
      status: HTTP_STATUS_OK,
      headers: {
        [HttpHeaderContentType]: JsonResponseMimeType,
        'Set-Cookie': cookie,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ErrorAuthFailed;
    return new Response(JSON.stringify({ error: message }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }
}
