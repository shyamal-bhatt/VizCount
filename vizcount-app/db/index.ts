import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'

import schema from './schema'
import { ScannedItem } from './models/ScannedItem'
import { SalesFloor } from './models/SalesFloor'
import { DefinedProduct } from './models/DefinedProduct'

// @ts-ignore: expo-file-system types might be slightly off with legacy deps
const docDir = FileSystem.documentDirectory;
const dbPath = Platform.OS === 'ios' ? `${docDir}SQLite/scanned_items.db` : `Context.getDatabasePath('scanned_items.db') (usually /data/user/0/com.shyamalbhatt.vizcountapp/databases/scanned_items.db)`;

console.log('====================================================');
console.log(`[WatermelonDB] Database Location:`);
console.log(`   OS: ${Platform.OS}`);
console.log(`   Path: ${dbPath}`);
console.log(`   Document Dir: ${docDir}`);
console.log('====================================================');

const adapter = new SQLiteAdapter({
    schema,
    dbName: 'scanned_items', // Explicitly name it to make it traceable
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
        SalesFloor,
        DefinedProduct,
    ],
})
