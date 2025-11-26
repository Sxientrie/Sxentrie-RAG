const { payload } = await jwtVerify(sessionJwt, secret);
return new Response(JSON.stringify(payload), {
  status: HTTP_STATUS_OK,
  headers: { [HttpHeaderContentType]: JsonResponseMimeType },
});
  } catch (error) {
  return new Response(JSON.stringify({ error: ErrorInvalidSession }), { status: HTTP_STATUS_UNAUTHORIZED });
}
}