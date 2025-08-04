import { closeSharedDatabase } from "./shared-db"

module.exports = async () => {
    await closeSharedDatabase()
}