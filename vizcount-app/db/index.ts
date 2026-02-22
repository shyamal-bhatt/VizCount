import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import schema from './schema'
import { ScannedItem } from './models/ScannedItem'

const adapter = new SQLiteAdapter({
    schema,
    jsi: true, /* Enable JSI for faster SQLite operations natively */
    onSetUpError: error => {
        // Log errors on DB launch
        console.error('[WatermelonDB] Setup Error:', error)
    }
})

export const database = new Database({
    adapter,
    modelClasses: [
        ScannedItem,
    ],
})
