import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'scanned_items',
            columns: [
                { name: 'product_id', type: 'string', isIndexed: true },
                { name: 'product_name', type: 'string', isOptional: true },
                { name: 'batch_number', type: 'string', isOptional: true },
                { name: 'expiration_date', type: 'string', isOptional: true },
                { name: 'raw_ocr_text', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
    ]
})
