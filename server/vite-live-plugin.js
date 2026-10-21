import { loadEnv } from 'vite'
import { createHandler, createLiveService } from './baseball-live.js'

export function liveApiPlugin() {
  let handler
  return {
    name: 'baseball-live-api',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir, '')
      handler = createHandler(createLiveService({ getKey: () => env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY }))
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/baseball-live') return next()
        res.status = code => { res.statusCode = code; return res }
        res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)) }
        handler(req, res)
      })
    },
  }
}
