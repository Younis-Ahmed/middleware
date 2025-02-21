/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from 'hono/serve-static'
import { readFile } from 'fs/promises'
import { discordAuth } from '../dist/providers/discord/index.mjs'

const app = new Hono()
// Apply secure headers middleware globally, disabling xContentTypeOptions so that CSS files served with incorrect MIME types are allowed.
app.use('*', secureHeaders({ xContentTypeOptions: false }))

// Use the same getContent logic for the default handler.
const defaultGetContent = async (path: string, c: any): Promise<any> => {
  try {
    const data = await readFile(`${process.cwd()}/${path}`)
    return new Uint8Array(data)
  } catch (err) {
    return null
  }
}

app.use(
  '*',
  serveStatic({
    root: './',
    getContent: defaultGetContent,
  })
)

// Add a simple root route for sanity check.
app.get('/', async (c) => {
  try {
    return c.html(html` <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>OAuth2.0 Example</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          button {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <h1>Welcome to the Discord OAuth Server</h1>
        <button id="oauth-btn">Login with Discord</button>
        <script>
          document.getElementById('oauth-btn').addEventListener('click', () => {
            window.location.href = '/discord'
          })
        </script>
      </body>
    </html>`)
  } catch (err) {
    console.error('Error reading index.html:', err)
    return c.text('index.html not found', 404)
  }
})

// Initiate the OAuth flow at the /discord route.
app.use(
  '/discord',
  discordAuth({
    client_id: Bun.env.DISCORD_ID,
    client_secret: Bun.env.DISCORD_SECRET,
    scope: ['identify', 'email'],
  })
)

// Callback route to capture the OAuth response and show token details.
app.get('/discord/callback', (c) => {
  const token = c.get('token')
  const refreshToken = c.get('refresh-token')
  const grantedScopes = c.get('granted-scopes')
  const user = c.get('user-discord')
  console.log('user', JSON.stringify(user, null, 2))
  return c.json({
    token,
    refreshToken,
    grantedScopes,
    user,
  })
})

export default app
