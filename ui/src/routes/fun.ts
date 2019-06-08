
import { Express } from 'express'
import { Connection } from 'typeorm'

import { TokenRepo } from '../token'

export function addFunRoutes(app: Express, conn: Connection) {
  const tokens = new TokenRepo(conn)
}
