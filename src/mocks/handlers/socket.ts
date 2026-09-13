/**
 * Socket.IO transport mock. The real `socket.io-client` connects over
 * WebSocket to `/socket.io/`; MSW intercepts the WebSocket and
 * `@mswjs/socket.io-binding` speaks the Engine.IO/Socket.IO framing.
 *
 * Limitations (documented in ARCHITECTURE.md): websocket transport only
 * (no polling), single default namespace, no rooms/acks; pings are emitted by
 * this handler so the client's heartbeat never times out.
 */
import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { REALTIME_EVENTS } from '@/lib/api/contracts'
import { getDb } from '../db'
import { authenticateConnection, registerConnection, unregisterConnection } from '../realtime'

const PING_INTERVAL_MS = 20_000

const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
// MSW strips the "/socket.io/" prefix from the client URL before matching
// (WebSocketHandler#match), so the link targets the origin root.
const links = [ws.link(`${scheme}://${window.location.host}/*`)]

export const socketHandlers = links.map((link) =>
  link.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const id = crypto.randomUUID()

    const ping = setInterval(() => {
      try {
        connection.client.send('2') // Engine.IO ping
      } catch {
        clearInterval(ping)
      }
    }, PING_INTERVAL_MS)

    registerConnection({
      id,
      userId: null,
      emit: (event, payload) => io.client.emit(event, payload),
      close: () => connection.client.close(),
    })

    io.client.on(REALTIME_EVENTS.sessionAuth, (_event, payload: { token?: string | null }) => {
      const db = getDb()
      const session = payload?.token ? db.sessions.find((s) => s.token === payload.token) : null
      const valid = session && new Date(session.expiresAt).getTime() > Date.now()
      authenticateConnection(id, valid ? session!.userId : null)
      io.client.emit(REALTIME_EVENTS.sessionAuthAck, { userId: valid ? session!.userId : null })
    })

    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      unregisterConnection(id)
    })
  }),
)
