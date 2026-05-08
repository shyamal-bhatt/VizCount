import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '@/db';
import { DefinedProduct } from '@/db/models/DefinedProduct';
import { ScannedItem } from '@/db/models/ScannedItem';
import { Q } from '@nozbe/watermelondb';
import { Logger } from '@/utils/logger';

export function useScannerDB() {
    const [catalogMap, setCatalogMap] = useState<Map<string, DefinedProduct>>(new Map());
    const [gtinMap, setGtinMap] = useState<Map<string, DefinedProduct>>(new Map());
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

    // 1. Subscribe to defined_products for instant validation
    useEffect(() => {
        Logger.info('ScannerDB', 'Initializing inside-memory catalogMap subscription');
        const catSub = database.collections
            .get<DefinedProduct>('defined_products')
            .query()
            .observeWithColumns(['gtin'])
            .subscribe((products: DefinedProduct[]) => {
                const productMap = new Map<string, DefinedProduct>();
                const gMap = new Map<string, DefinedProduct>();
                products.forEach(p => {
                    productMap.set(p.pid, p);
                    if (p.gtin) {
                        gMap.set(p.gtin, p);
                    }
                });
                Logger.info('ScannerDB', `CatalogMap observer fired — loaded ${productMap.size} products (${gMap.size} with GTINs)`);
                console.log(`[ScannerDB] 📦 catalogMap observer fired — ${productMap.size} products, ${gMap.size} with GTINs`);
                products.forEach(p => console.log(
                    `  → pid:${p.pid} | gtin:${p.gtin} (type:${typeof p.gtin}, truthy:${!!p.gtin}) | name:"${p.name}" | id:${p.id}`
                ));
                console.log(`[ScannerDB] 🗺️ gMap keys after rebuild: [${Array.from(gMap.keys()).join(', ')}]`);
                setCatalogMap(productMap);
                setGtinMap(gMap);
            });
        return () => catSub.unsubscribe();
    }, []);

    // Always-current ref for catalogMap — allows updateProductGTIN (and any
    // other write operations) to find the latest Product model without needing
    // to be re-created every time the Map updates.
    const catalogMapRef = useRef(catalogMap);
    useEffect(() => { catalogMapRef.current = catalogMap; }, [catalogMap]);

    // 2. Subscribe to scanned_items for the UI list
    useEffect(() => {
        Logger.info('ScannerDB', 'Subscribing to scanned_items observer for the UI list');
        const subscription = database.collections
            .get<ScannedItem>('scanned_items')
            .query()
            .observe()
            .subscribe((items) => {
                const sorted = [...items].sort(
                    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
                );
                setScannedItems(sorted);
            });
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // 3. Database Writing Method
    const saveScannedItem = async (data: {
        pid: string;
        netKg: number;
        sn: string;
        name: string;
        type: string;
        pack: number;
        bestBeforeDate: number | null;
    }) => {
        await database.write(async () => {
            const items = database.collections.get('scanned_items');
            await items.create((item: any) => {
                item.pid = data.pid;
                item.netKg = data.netKg;
                item.sn = data.sn;
                item.name = data.name;
                item.count = data.pack; // Default the scanner count to the product's pack size
                item.bestBeforeDate = data.bestBeforeDate;
            });
        });
        Logger.info('ScannerDB', `Successfully saved item to WatermelonDB: ${data.name} (SN: ${data.sn})`);
    };

    const checkDuplicateSN = async (pid: string, sn: string): Promise<boolean> => {
        const existing = await database.collections
            .get<ScannedItem>('scanned_items')
            .query(
                Q.where('pid', pid),
                Q.where('sn', sn)
            )
            .fetch();
        return existing.length > 0;
    };

    const checkGlobalDuplicateSN = async (sn: string): Promise<boolean> => {
        if (!sn) return false;
        const existing = await database.collections
            .get<ScannedItem>('scanned_items')
            .query(Q.where('sn', sn))
            .fetch();
        return existing.length > 0;
    };

    const deleteItem = async (id: string) => {
        await database.write(async () => {
            const item = await database.collections.get<ScannedItem>('scanned_items').find(id);
            await item.destroyPermanently();
        });
    };

    const updateItemCount = async (id: string, newCount: number) => {
        await database.write(async () => {
            const item = await database.collections.get<ScannedItem>('scanned_items').find(id);
            await item.update((rec: any) => {
                rec.count = newCount;
            });
        });
    };

    const updateProductGTIN = useCallback(async (pid: string, gtin: string) => {
        const product = catalogMapRef.current.get(pid);
        if (product) {
            try {
                await database.write(async () => {
                    await product.update((rec: any) => {
                        rec.gtin = gtin;
                    });
                });
                Logger.info('ScannerDB', `Updated product ${pid} with GTIN ${gtin}`);
                console.log(`[ScannerDB] 🔗 GTIN ${gtin} saved to pid:${pid} (id:${product.id})`);

                // ⭐ EAGER UPDATE: Push the GTIN→Product mapping into state immediately
                // so subsequent scans see it without waiting for the observer to re-fire.
                // This eliminates the "gtinMapRef has 0 entries" bug where the observer
                // didn't re-emit on field-level mutations.
                setGtinMap(prev => {
                    const next = new Map(prev);
                    next.set(gtin, product);
                    return next;
                });
                console.log(`[ScannerDB] ⚡ Eagerly updated gtinMap with GTIN ${gtin} → pid:${pid}`);
            } catch (error) {
                Logger.error('ScannerDB', `Failed to update GTIN for pid ${pid}`, error);
            }
        } else {
            Logger.warn('ScannerDB', `Could not find Product Model for PID ${pid} to map GTIN.`);
        }
    }, []); // stable — reads latest map via catalogMapRef.current

    /**
     * Persist a learned shelf life back to the product record.
     *
     * Idempotent guard: only writes if shelfLifeDays is not yet set (null / 0).
     * This ensures a previously confirmed value is never overwritten by a bad OCR read.
     * Also eagerly patches catalogMap so the current session benefits immediately.
     */
    const updateProductShelfLife = useCallback(async (pid: string, days: number) => {
        const product = catalogMapRef.current.get(pid);
        if (!product) {
            Logger.warn('ScannerDB', `updateProductShelfLife: PID ${pid} not found in catalogMapRef`);
            return;
        }

        // Idempotent guard — never overwrite an already-confirmed shelf life
        if (product.shelfLifeDays && product.shelfLifeDays > 0) {
            console.log(`[ScannerDB] ⏩ shelf_life_days already set for pid:${pid} (${product.shelfLifeDays}d) — skipping write`);
            return;
        }

        try {
            await database.write(async () => {
                await product.update((rec: any) => {
                    rec.shelf_life_days = days;
                });
            });
            Logger.info('ScannerDB', `Learned shelf life ${days}d for pid:${pid}`);
            console.log(`[ScannerDB] 📚 Shelf life learned: pid:${pid} = ${days} days`);

            // Eagerly update catalogMap so the next scan in the same session can skip OCR
            setCatalogMap(prev => {
                const next = new Map(prev);
                const updated = next.get(pid);
                if (updated) {
                    // WatermelonDB model objects are mutable via update(); patch the
                    // in-memory reference so React sees the new shelfLifeDays value.
                    (updated as any)._raw.shelf_life_days = days;
                    next.set(pid, updated);
                }
                return next;
            });
            console.log(`[ScannerDB] ⚡ Eagerly patched catalogMap shelf life for pid:${pid} = ${days}d`);
        } catch (error) {
            Logger.error('ScannerDB', `Failed to write shelf life for pid ${pid}`, error);
        }
    }, []); // stable — reads latest map via catalogMapRef.current

    return {
        catalogMap,
        gtinMap,
        scannedItems,
        saveScannedItem,
        checkDuplicateSN,
        checkGlobalDuplicateSN,
        deleteItem,
        updateItemCount,
        updateProductGTIN,
        updateProductShelfLife,
    };
}
