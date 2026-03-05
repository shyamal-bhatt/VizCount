import { useState, useEffect } from 'react';
import { database } from '@/db';
import { DefinedProduct } from '@/db/models/DefinedProduct';
import { ScannedItem } from '@/db/models/ScannedItem';
import { Q } from '@nozbe/watermelondb';
import { Logger } from '@/utils/logger';

export function useScannerDB() {
    const [catalogMap, setCatalogMap] = useState<Map<number, DefinedProduct>>(new Map());
    const [gtinMap, setGtinMap] = useState<Map<number, DefinedProduct>>(new Map());
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

    // 1. Subscribe to defined_products for instant validation
    useEffect(() => {
        Logger.info('ScannerDB', 'Initializing inside-memory catalogMap subscription');
        const catSub = database.collections
            .get<DefinedProduct>('defined_products')
            .query()
            .observe()
            .subscribe((products: DefinedProduct[]) => {
                const productMap = new Map<number, DefinedProduct>();
                const gMap = new Map<number, DefinedProduct>();
                products.forEach(p => {
                    productMap.set(p.pid, p);
                    if (p.gtin) {
                        gMap.set(p.gtin, p);
                    }
                });
                Logger.info('ScannerDB', `CatalogMap observer fired — loaded ${productMap.size} products (${gMap.size} with GTINs)`);
                setCatalogMap(productMap);
                setGtinMap(gMap);
            });
        return () => catSub.unsubscribe();
    }, []);

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
        pid: number;
        netKg: number;
        sn: number;
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

    // 4. Checking for duplicate Serial Numbers
    const checkDuplicateSN = async (sn: number): Promise<boolean> => {
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

    const updateProductGTIN = async (pid: number, gtin: number) => {
        const products = await database.collections
            .get<DefinedProduct>('defined_products')
            .query(Q.where('pid', pid))
            .fetch();

        if (products.length > 0) {
            await database.write(async () => {
                await products[0].update((rec: any) => {
                    rec.gtin = gtin;
                });
            });
            Logger.info('ScannerDB', `Updated product ${pid} with GTIN ${gtin}`);
        }
    };

    return {
        catalogMap,
        gtinMap,
        scannedItems,
        saveScannedItem,
        checkDuplicateSN,
        deleteItem,
        updateItemCount,
        updateProductGTIN
    };
}
