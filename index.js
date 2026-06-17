// Regular expression to extract the bot token and API method from the incoming URL path.
// It expects the format: /bot<TOKEN>/<API_METHOD>
// Uses named capture groups (?<token> and ?<api_method>) for safer and easier extraction.
const BOT_PATH_REGEX =
  /^\/bot(?<token>\d+:[A-Za-z0-9_-]{35,})\/(?<api_method>[A-Za-z][A-Za-z0-9_]*)$/;

export default {
  /**
   * The main fetch handler for the worker/server.
   * Intercepts incoming requests and proxies them to the official Telegram Bot API.
   */
  async fetch(request) {
    const url = new URL(request.url);

    // 1. Health check endpoint
    if (url.pathname === "/") {
      return Response.json({
        success: true,
        message: "Everything looks good and running.",
      });
    }

    // 2. Path validation
    // Attempt to match the request path against our expected Telegram API regex format.
    const match = url.pathname.match(BOT_PATH_REGEX);

    // If the path doesn't match the required format, reject it with a 400 Bad Request error.
    if (!match?.groups) {
      return Response.json(
        {
          success: false,
          error: "Invalid path. Expected /bot<TOKEN>/<METHOD>",
        },
        { status: 400 }
      );
    }

    // 3. Request translation
    // Extract the parsed token and method using destructuring from the regex named groups.
    const { token, api_method } = match.groups;

    // Construct the destination URL for the official Telegram Bot API.
    const Turl = `https://api.telegram.org/bot${token}/${api_method}${url.search}`;

    // 4. Proxy the request
    try {
      // Forward the request to Telegram. 
      const telegramResponse = await fetch(new Request(Turl, request));

      // Return the exact response (body, status, and headers) received from Telegram back to the original client.
      return new Response(telegramResponse.body, {
        status: telegramResponse.status,
        statusText: telegramResponse.statusText,
        headers: telegramResponse.headers,
      });
    } catch (error) {
      // 5. Error handling
      // Catch network-level errors (e.g., DNS failure, Telegram API is down) and return a 502 Bad Gateway.
      return Response.json(
        { success: false, error: "Failed to connect to Telegram API" },
        { status: 502 }
      );
    }
  },
};