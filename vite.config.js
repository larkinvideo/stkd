import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the Vercel function in api/chat.js during `npm run dev`, so /api/chat
// works locally without `vercel dev`. Loaded through ssrLoadModule so edits apply
// without restarting the server.
function apiDevServer() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const k of ['ANTHROPIC_API_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
        if (env[k] && !process.env[k]) process.env[k] = env[k]
      }
      server.middlewares.use('/api/chat', async (req, res) => {
        try {
          const { default: handler } = await server.ssrLoadModule('/api/chat.js')
          await handler(req, res)
        } catch (e) {
          server.config.logger.error(e.stack || String(e))
          if (!res.headersSent) res.statusCode = 500
          res.end(JSON.stringify({ error: 'Local API error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServer()],
})
