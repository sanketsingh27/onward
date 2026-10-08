export type Env = {
  BOARD_DB: D1Database
  APP_DB: D1Database
  AI: Ai
  VECTORIZE: VectorizeIndex
  SCAN_QUEUE: Queue
  CLERK_JWT_KEY: string
  CLERK_AUTHORIZED_PARTIES: string
}
