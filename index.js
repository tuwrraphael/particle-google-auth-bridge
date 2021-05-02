addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

function accessControlHeaders(request) {
  let allowed = ["http://localhost:9000", "https://tuwrraphael.github.io", "https://smarthome-app.kesal.at"];
  let idx = allowed.indexOf(request.headers.get("Origin"));
  if (idx > -1) {
    return {
      "Access-Control-Allow-Origin": allowed[idx]
    };
  }
  return {};
}

function getErrorResponse(error, request) {
  return new Response(JSON.stringify({
    error: error
  }), {
    headers: {
      "content-type": "application/json",
      ...accessControlHeaders(request)
    },
    status: 400,
    statusText: "Bad Request",
  });
}

async function handleRequest(request) {
  let url = new URL(request.url);
  if (url.pathname === "/token" && request.method == "POST") {
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return getErrorResponse("invalid_request", request);
    }
    const formData = await request.formData();
    if (formData.get("grant_type") != "urn:ietf:params:oauth:grant-type:token-exchange") {
      return getErrorResponse("unsupported_grant_type", request);
    }


    const subjectToken = formData.get("subject_token");
    if (null == subjectToken || formData.get("subject_token_type") != "urn:ietf:params:oauth:token-type:access_token") {
      return getErrorResponse("invalid_request", request);
    }
    let userId;
    try {
      let res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${subjectToken}`);
      if (!res.ok) {
        throw new Error(`id token validation resulted in ${res.status}`);
      }
      let body = (await res.json());
      if (body.aud != GOOGLE_AUD && body.aud != ALEXA_AUD) {
        throw new Error("audience mismatch");
      }
      if (new Date(body.exp * 1000) < new Date()) {
        throw new Error("id token expired");
      }
      userId = body.sub;
    }
    catch (err) {
      return getErrorResponse("invalid_grant", request);
    }
    let stored = await PARTICLE_GOOGLE_AUTH.get(userId);
    if (!stored) {
      return new Response("Not found", {
        headers: {
          "content-type": "text/plain",
          ...accessControlHeaders(request)
        },
        status: 404,
        statusText: "Not Found"
      });
    }
    let [clientId, clientSecret] = stored.split(":");
    let body = new URLSearchParams();
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
    body.set("grant_type", "client_credentials");
    body.set("expires_in", 3600);
    let particleRes = await fetch("https://api.particle.io/oauth/token", {
      method: "POST",
      body: body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
    });
    if (!particleRes.ok) {
      return new Response(`Could not get an access_token for the configured particle credentials. Statuscode: ${particleRes.status}.`, {
        headers: {
          "content-type": "text/plain",
          ...accessControlHeaders(request)
        },
        status: 400,
        statusText: "Bad Request"
      });
    }
    let tokenRes = await particleRes.json();
    return new Response(
      JSON.stringify({
        access_token: tokenRes.access_token,
        expires_in: tokenRes.expires_in
      }),
      {
        headers: {
          "content-type": "application/json",
          ...accessControlHeaders(request)
        }
      });
  }
  return new Response("Not found", {
    headers: { "content-type": "text/plain" },
    status: 404,
    statusText: "Not Found"
  });
}
