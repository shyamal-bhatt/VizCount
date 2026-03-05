import { database } from '.'
import { DefinedProduct } from './models/DefinedProduct'
import { Q } from '@nozbe/watermelondb'

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
    { name: 'COHO 2PC PORTIONS', pid: 50571637, pack: 6, type: 'Seafood' },
    { name: 'YFM BASA FILLET', pid: 31237250, pack: 6, type: 'Seafood' },
    { name: 'GOAT CUBES BONE IN', pid: 31710966, pack: 12, type: 'Halal' },
    { name: 'AA STRIPLOIN STEAK', pid: 50772502, pack: 8, type: 'Beef' },
    { name: 'AA TRI TIP', pid: 50772503, pack: 8, type: 'Beef' },
    { name: 'AA BLADE STEAK', pid: 50772504, pack: 8, type: 'Beef' },
    { name: 'BF TRI TIP SIRLOIN', pid: 50158149, pack: 8, type: 'Beef' },
    { name: 'BFSTK SRLN TIP C11YF', pid: 30062738, pack: 6, type: 'Beef' },
    { name: 'BFSTK INSD RND C05YF', pid: 31742690, pack: 8, type: 'Beef' },
    { name: 'BFRST INSD BLD C09YF', pid: 30512733, pack: 8, type: 'Beef' },
    { name: 'PKSSG BR MAPLE 900ML', pid: 31439394, pack: 6, type: 'Pork' },
    { name: 'PKSSG BR MAPLE 375JV', pid: 50576420, pack: 12, type: 'Pork' },
    { name: 'PKSSG BR ORIG 375JV', pid: 50576421, pack: 12, type: 'Pork' },
    { name: 'PKSSG BR RND 250JV', pid: 50576425, pack: 8, type: 'Pork' },
    { name: 'PKSSG BR ORIG 900ML', pid: 30347833, pack: 6, type: 'Pork' },
    { name: 'PKSSG BR ORIG 375ML', pid: 30010520, pack: 8, type: 'Pork' },
    { name: 'PKSSG BR MAPLE 375ML', pid: 30010521, pack: 8, type: 'Pork' },
    { name: 'JVL BWN SUG HON', pid: 50576373, pack: 12, type: 'Pork' },
    { name: 'PKSSG DN MLDIT 500JV', pid: 50576422, pack: 12, type: 'Pork' },
    { name: 'PKSSG DN HOTIT 500JV', pid: 50576423, pack: 12, type: 'Pork' },
    { name: 'PKSSG DN BRAT 500JV', pid: 50576424, pack: 12, type: 'Pork' },
    { name: 'PKSSG GR MLDIT 454JV', pid: 50576427, pack: 8, type: 'Pork' },
    { name: 'PKRIB BACK C10ML', pid: 50194696, pack: 4, type: 'Pork' },
    { name: 'PKRIB SIDE C18ML', pid: 50194698, pack: 8, type: 'Pork' },
    { name: 'PKRIB SWEETNSR C18ML', pid: 50194701, pack: 6, type: 'Pork' },
    { name: 'PORK SIDE RIBS', pid: 30794606, pack: 9, type: 'Pork' },
    { name: 'PKGRD LEAN 454ML', pid: 31034407, pack: 12, type: 'Pork' },
    { name: 'PKGRD LEAN 454MR', pid: 50177843, pack: 12, type: 'Pork' },
    { name: 'PKGRD LEAN 1.36ML', pid: 30438002, pack: 8, type: 'Pork' },
    { name: 'PK MEATBALL 375YF', pid: 30831611, pack: 6, type: 'Pork' },
    { name: 'PK BELLY BL C09MR', pid: 50600221, pack: 8, type: 'Pork' },
    { name: 'PKRIB SWEETNSR C18MR', pid: 50600224, pack: 6, type: 'Pork' },
    { name: 'PKCHP FST FRY COBMR', pid: 50177806, pack: 8, type: 'Pork' },
    { name: 'PKCHP CTR RIB C14ML', pid: 50177839, pack: 4, type: 'Pork' },
    { name: 'PKCHP BL CC RB C08ML', pid: 50725724, pack: 8, type: 'Pork' },
    { name: 'PKCHP COMBO C15ML', pid: 50191456, pack: 4, type: 'Pork' },
    { name: 'PKCHP BL CC RB C08MR', pid: 50742149, pack: 8, type: 'Pork' },
    { name: 'PKCHP CTRB BI C08ML', pid: 50194643, pack: 8, type: 'Pork' },
    { name: 'PKCHP CTRB BI C08MR', pid: 50194684, pack: 8, type: 'Pork' },
    { name: 'PK HALF LOIN', pid: 30426668, pack: 8, type: 'Pork' },
    { name: 'PK TNDRLN C12FL', pid: 31330154, pack: 6, type: 'Pork' },
    { name: 'PKRST BLD BL C13ML', pid: 30512791, pack: 8, type: 'Pork' },
    { name: 'BFSTK INS ROUND HL', pid: 50617592, pack: 4, type: 'Beef' },
    { name: 'PRIME RWA THIN SLICD', pid: 30388227, pack: 8, type: 'Organic Chicken' },
    { name: 'PRIME RWA BSB', pid: 31311643, pack: 12, type: 'Organic Chicken' },
    { name: 'PRIME RWA BSB VP', pid: 31052846, pack: 6, type: 'Organic Chicken' },
    { name: 'PRIME ORG BSB', pid: 31396049, pack: 8, type: 'Organic Chicken' },
    { name: 'PR RWA DICED CHK', pid: 50714850, pack: 8, type: 'Organic Chicken' },
    { name: 'PRIME RWA BST', pid: 30489356, pack: 12, type: 'Organic Chicken' },
    { name: 'ML CKN BSB VP', pid: 30798737, pack: 6, type: 'Maple Leaf Chicken' },
    { name: 'ML CKN BRST BNLSKNLS', pid: 9314778, pack: 8, type: 'Maple Leaf Chicken' },
    { name: 'ML CHKN DRUMS VP', pid: 30096145, pack: 6, type: 'Maple Leaf Chicken' },
    { name: 'ML CHKN THIGHS VP', pid: 30096200, pack: 6, type: 'Maple Leaf Chicken' },
    { name: 'BFRST SRLN TIP C10YF', pid: 30512743, pack: 8, type: 'Beef'},
    { name: 'BFGRD XLEAN C14YF', pid: 30910241, pack: 8, type: 'Beef'},
    { name: 'BFGRD MEDIUM C14YF', pid: 30054234, pack: 8, type: 'Beef'},
    { name: 'BFGRD MEDIUM 454YF', pid: 30231907, pack: 12, type: 'Beef'},
    { name: 'BFGRD LEAN 454YF', pid: 30231908, pack: 12, type: 'Beef'},
    { name: 'BFGRD LEAN C14YF', pid: 30053516, pack: 8, type: 'Beef'},
    { name: 'BF MEATBALL', pid: 30831503, pack: 6, type: 'Beef'},
    { name: 'BFGRD XLEAN 454YF', pid: 30232055, pack: 12, type: 'Beef'},
    { name: 'BFGRD REGULAR TB1YF', pid: 31637355, pack: 30, type: 'Beef'},
    { name: 'BFGRD LEAN TB1YF', pid: 31637357, pack: 30, type: 'Beef'},
    { name: 'BFGRD LEAN TB1YF', pid: 30700923, pack: 30, type: 'Beef'},
    { name: 'AQMR SURIMI FLAKE1KG', pid: 30423042, pack: 10, type: 'Seafood'},
    { name: 'AQMR SURIMI FLAKE340', pid: 30953524, pack: 12, type: 'Seafood'},
    { name: 'AQMR SURIMI STICK340', pid: 30953525, pack: 12, type: 'Seafood'},
    { name: 'YFM SLMN ATL PTN 2PC', pid: 30133763, pack: 6, type: 'Seafood'},
    { name: 'YFM SWT SMKY COHO', pid: 50712337, pack: 6, type: 'Seafood'},
    { name: 'YFM ATL SLMN W/BUTR', pid: 50712345, pack: 6, type: 'Seafood'},
    { name: 'YFM LMN HRB COHO', pid: 50712348, pack: 6, type: 'Seafood'},
    { name: 'YFM SLMN COHO FILLET', pid: 31237716, pack: 6, type: 'Seafood'},
    { name: 'YFM RAINBW TROUT FLT', pid: 31237972, pack: 6, type: 'Seafood'},
    { name: 'YFM TILAPIA FILLET', pid: 31237984, pack: 6, type: 'Seafood'},
    { name: 'YFM SLMN ATLANTIC PTN', pid: 31236718, pack: 6, type: 'Seafood'},
]

/**
 * Upsert-style seed for defined_products.
 *
 * - Inserts products that do not yet exist in the DB (matched by PID).
 * - Skips products that already exist so accumulated GTINs are never wiped.
 * - Safe to call on every app launch.
 */
export async function seedDefinedProducts(): Promise<void> {
    try {
        const collection = database.collections.get<DefinedProduct>('defined_products')

        // Build a Set of PIDs that are already in the DB
        const existing = await collection.query().fetch()
        const existingPIDs = new Set(existing.map(p => p.pid))

        const toInsert = SEED_PRODUCTS.filter(p => !existingPIDs.has(p.pid))

        if (toInsert.length === 0) {
            console.log(`[Seed] defined_products up-to-date — ${existing.length} products, nothing to insert.`)
            return
        }

        await database.write(async () => {
            const creates = toInsert.map(p =>
                collection.prepareCreate(record => {
                    record.name = p.name
                    record.pid = p.pid
                    record.pack = p.pack
                    record.type = normalizeType(p.type)
                    // gtin intentionally omitted — will be populated during scanning
                })
            )
            await database.batch(...creates)
        })

        console.log(`[Seed] Inserted ${toInsert.length} new products. Total: ${existing.length + toInsert.length}.`)
    } catch (error) {
        console.error('[Seed] Failed to seed defined_products:', error)
    }
}
