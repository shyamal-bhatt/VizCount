import { database } from '.'
import { DefinedProduct } from './models/DefinedProduct'

// Normalize type casing to match app's PRODUCT_TYPES constant
const TYPE_MAP: Record<string, string> = {
    'organic chicken': 'Organic Chicken',
    'maple leaf chicken': 'Maple Leaf Chicken',
    'halal': 'Halal',
    'beef': 'Beef',
    'pork': 'Pork',
    'seafood': 'Seafood',
}

const normalizeType = (type: string): string =>
    TYPE_MAP[type.toLowerCase()] ?? type

const SEED_PRODUCTS = [
    { name: 'PRIME ORG WB', pid: 31396056, pack: 6, type: 'Organic Chicken' },
    { name: 'ML WHOLE WING', pid: 31180986, pack: 8, type: 'Maple Leaf Chicken' },
    { name: 'PRIME ORG SPLT WNG', pid: 30031863, pack: 8, type: 'Organic Chicken' },
    { name: 'MINA HALAL CHN LG QT', pid: 30148922, pack: 6, type: 'Halal' },
    { name: 'MINA HALAL CHN WHOLE', pid: 30148926, pack: 6, type: 'Halal' },
    { name: 'MINA HALAL CHKN DRUM', pid: 30148672, pack: 6, type: 'Halal' },
    { name: 'MINA HALAL CHN GRNDS', pid: 30212214, pack: 12, type: 'Halal' },
    { name: 'MINA HALAL CHN BSB', pid: 31430278, pack: 8, type: 'Halal' },
    { name: 'MINA HALAL BSB VP', pid: 31561685, pack: 6, type: 'Halal' },
    { name: 'MINA HALAL CHN BST', pid: 30433243, pack: 12, type: 'Halal' },
    { name: 'MINA HALAL CHN THIGH', pid: 30148828, pack: 6, type: 'Halal' },
]

export async function seedDefinedProducts(): Promise<void> {
    try {
        const collection = database.collections.get<DefinedProduct>('defined_products')
        const existing = await collection.query().fetch()

        // Only seed if the table is empty — avoids duplicates on every reload
        if (existing.length > 0) {
            console.log('[Seed] defined_products already populated, skipping.')
            return
        }

        await database.write(async () => {
            const creates = SEED_PRODUCTS.map(p =>
                collection.prepareCreate(record => {
                    record.name = p.name
                    record.pid = p.pid
                    record.pack = p.pack
                    record.type = normalizeType(p.type)
                })
            )
            await database.batch(...creates)
        })

        console.log(`[Seed] Inserted ${SEED_PRODUCTS.length} defined products.`)
    } catch (error) {
        console.error('[Seed] Failed to seed defined_products:', error)
    }
}
