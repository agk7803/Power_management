import app from "./app.js"
import connectDB from "./config/db.js"
import dotenv from "dotenv"
import { startScheduler } from "./services/scheduler.service.js"

dotenv.config()

const PORT = process.env.PORT || 5000

async function boot() {
  await connectDB()
  startScheduler()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

boot().catch(console.error)