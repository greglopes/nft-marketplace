import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { favoritesHandlers } from './favorites'
import { orderHandlers } from './orders'
import { socketHandlers } from './socket'

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...socketHandlers,
]
