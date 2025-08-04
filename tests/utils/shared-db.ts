import { DataSource } from "typeorm"
import TestDataSource from "./ormconfig"
import { seed } from "./seed"

let sharedDb: DataSource | null = null
let isInitializing = false

export async function getSharedDatabase(): Promise<DataSource> {
    if (sharedDb) {
        return sharedDb
    }
    
    // Prevent concurrent initialization
    if (isInitializing) {
        while (isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 10))
        }
        return sharedDb!
    }
    
    isInitializing = true
    try {
        sharedDb = TestDataSource
        if (!sharedDb.isInitialized) {
            await sharedDb.initialize()
            await seed(sharedDb)
        }
        return sharedDb
    } finally {
        isInitializing = false
    }
}

export async function closeSharedDatabase(): Promise<void> {
    if (sharedDb && sharedDb.isInitialized) {
        await sharedDb.destroy()
        sharedDb = null
    }
}