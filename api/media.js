// Vercel serverless function: proxies media searches so the TMDB / RAWG keys stay on the server.
// Only a fixed set of search endpoints is allowed, and results are cached at Vercel's edge.
const SOURCES = {
  movie: q => `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(q)}`,
  tv: q => `https://api.themoviedb.org/3/search/tv?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(q)}`,
  game: q => `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(q)}&page_size=4`,
};

function send(res, status, body, cache = false) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  if (cache) res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "Method not allowed" });
  }
  const url = new URL(req.url, "http://local");
  const src = url.searchParams.get("src");
  const q = (url.searchParams.get("query") || "").trim().slice(0, 100);
  if (!SOURCES[src]) return send(res, 400, { error: "Unknown source" });
  if (!q) return send(res, 400, { error: "query is required" });
  const needsKey = src === "game" ? process.env.RAWG_API_KEY : process.env.TMDB_API_KEY;
  if (!needsKey) return send(res, 500, { error: "Media API key is not configured on the server" });
  try {
    const upstream = await fetch(SOURCES[src](q));
    if (!upstream.ok) return send(res, 502, { error: `Upstream error (${upstream.status})` });
    const data = await upstream.json();
    return send(res, 200, { results: data.results || [] }, true);
  } catch {
    return send(res, 502, { error: "Could not reach media API" });
  }
}
