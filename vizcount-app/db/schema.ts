import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
    version: 4,
    tables: [
        tableSchema({
            name: 'scanned_items',
            columns: [
                { name: 'pid', type: 'number', isIndexed: true },
                { name: 'sn', type: 'number', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'best_before_date', type: 'number', isOptional: true },
                { name: 'packed_on_date', type: 'number', isOptional: true },
                { name: 'net_kg', type: 'number', isOptional: true },
                { name: 'count', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
        tableSchema({
            name: 'sales_floor',
            columns: [
                { name: 'pid', type: 'number', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'count', type: 'number', isOptional: true },
                { name: 'weight', type: 'number', isOptional: true },
                { name: 'expiry_date', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
        tableSchema({
            name: 'defined_products',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'pid', type: 'number', isIndexed: true },
                { name: 'pack', type: 'number' },
                { name: 'type', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
    ]
})
