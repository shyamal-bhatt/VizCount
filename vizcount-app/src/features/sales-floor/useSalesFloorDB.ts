import { useState, useEffect, useCallback } from 'react';
import { database } from '@/db';
import { SalesFloor } from '@/db/models/SalesFloor';
import { DefinedProduct } from '@/db/models/DefinedProduct';
import { Product } from '@/src/shared/ui/ProductPickerModal';

export function useSalesFloorDB() {
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

    const fetchDefinedProducts = useCallback(async () => {
        try {
            const collection = database.collections.get<DefinedProduct>('defined_products');
            const all = await collection.query().fetch();
            const products: Product[] = all.map(p => ({ pid: p.pid, name: p.name, type: p.type }));
            setAvailableProducts(products);
        } catch (error) {
            console.error("Failed to load defined products:", error);
        }
    }, []);

    useEffect(() => {
        fetchDefinedProducts();
        const subscription = database.collections.get('defined_products').changes.subscribe(() => {
            fetchDefinedProducts();
        });
        return () => subscription.unsubscribe();
    }, [fetchDefinedProducts]);

    const addFloorEntry = async (data: {
        type: 'count' | 'weight';
        product: Product;
        count?: number;
        stagedWeights?: { weight: string, date: string, id: string }[];
        expiryDate: string | null;
    }) => {
        await database.write(async () => {
            const floorCollection = database.collections.get('sales_floor');

            if (data.type === 'count') {
                let parsedExpiry = null;
                if (data.expiryDate) {
                    const [year, month, day] = data.expiryDate.split('-').map(Number);
                    parsedExpiry = new Date(year, month - 1, day).getTime();
                }
                await floorCollection.create((entry: any) => {
                    entry.pid = data.product.pid;
                    entry.name = data.product.name;
                    entry.count = data.count;
                    entry.weight = null;
                    entry.expiryDate = parsedExpiry;
                });
            } else if (data.type === 'weight') {
                if (!data.stagedWeights || data.stagedWeights.length === 0) return;
                const batchWrites = data.stagedWeights.map(staged => {
                    const [year, month, day] = staged.date.split('-').map(Number);
                    return floorCollection.prepareCreate((entry: any) => {
                        entry.pid = data.product.pid;
                        entry.name = data.product.name;
                        entry.count = 1;
                        entry.weight = parseFloat(staged.weight);
                        entry.expiryDate = new Date(year, month - 1, day).getTime();
                    });
                });
                await database.batch(...batchWrites);
            }
        });
    };

    const deleteFloorItem = async (id: string) => {
        await database.write(async () => {
            const item = await database.collections.get<SalesFloor>('sales_floor').find(id);
            await item.destroyPermanently();
        });
    };

    const updateFloorItem = async (
        item: SalesFloor,
        data: { weight?: number; count?: number; expiryDate: string | null }
    ) => {
        await database.write(async () => {
            await item.update(record => {
                if (data.weight !== undefined) record.weight = data.weight;
                if (data.count !== undefined) record.count = data.count;
                if (data.expiryDate) {
                    const [year, month, day] = data.expiryDate.split('-').map(Number);
                    record.expiryDate = new Date(year, month - 1, day).getTime();
                } else {
                    record.expiryDate = null;
                }
            });
        });
    };

    return {
        availableProducts,
        addFloorEntry,
        deleteFloorItem,
        updateFloorItem
    };
}
