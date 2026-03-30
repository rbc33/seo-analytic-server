import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { analyzeURL } from './analyzer'

const app = express()
const PORT = 3001

app.use(express.json())
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://seoanalyst.es', 'https://www.seoanalyst.es'],
    methods: ['GET', 'POST'],
  })
)

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again in a minute.' },
})

app.use('/api', limiter)

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body as { url?: string }

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' })
    return
  }

  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  try {
    new URL(normalizedUrl)
  } catch {
    res.status(400).json({ error: 'Invalid URL provided' })
    return
  }

  try {
    const result = await analyzeURL(normalizedUrl)
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Analysis failed for ${normalizedUrl}:`, message)

    if (message.includes('timeout')) {
      res.status(504).json({ error: 'Request timed out fetching the URL' })
    } else if (message.includes('status code 404')) {
      res.status(422).json({ error: 'Page not found (404)' })
    } else if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      res.status(422).json({ error: 'Could not reach the specified URL' })
    } else {
      res.status(500).json({ error: `Analysis failed: ${message}` })
    }
  }
})

app.listen(PORT, () => {
  console.log(`SEO Analyst server running on http://localhost:${PORT}`)
})
