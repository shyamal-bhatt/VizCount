import { useMemo } from 'react';
import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import { SalesFloor } from '@/db/models/SalesFloor';
import { Product } from '@/src/shared/ui/ProductPickerModal';

export function useCompareDB(scannedItems: ScannedItem[], floorItems: SalesFloor[], selectedProduct: Product | 'All' | null) {
    // ── Filter by selected product PID ──
    const filteredCooler = useMemo(() => {
        if (!selectedProduct || selectedProduct === 'All') return scannedItems;
        return scannedItems.filter(i => i.pid === selectedProduct.pid);
    }, [scannedItems, selectedProduct]);

    const filteredFloor = useMemo(() => {
        if (!selectedProduct || selectedProduct === 'All') return floorItems;
        return floorItems.filter(i => i.pid === selectedProduct.pid);
    }, [floorItems, selectedProduct]);

    // ── Aggregate counts ──────────────────
    const coolerCount = useMemo(() => filteredCooler.reduce((sum, i) => sum + (i.count ?? 1), 0), [filteredCooler]);

    const floorCount = useMemo(() => filteredFloor.reduce((sum, i) => {
        if (i.weight) return sum + 1;
        return sum + (i.count ?? 0);
    }, 0), [filteredFloor]);

    const totalCount = coolerCount + floorCount;

    // ── Chart: product breakdown across cooler ──
    const chartDataMap: Record<string, number> = useMemo(() => {
        const map: Record<string, number> = {};
        filteredCooler.forEach(item => {
            const name = item.name || 'Unknown';
            map[name] = (map[name] || 0) + (item.count ?? 1);
        });
        filteredFloor.forEach(item => {
            const name = item.name || 'Unknown';
            map[name] = (map[name] || 0) + (item.weight ? 1 : (item.count ?? 0));
        });
        return map;
    }, [filteredCooler, filteredFloor]);

    const chartData = useMemo(() => Object.keys(chartDataMap).map(key => ({
        product: key,
        count: chartDataMap[key]
    })), [chartDataMap]);

    // ── Dev tools ────────────────────────
    const seedMockData = async () => {
        const items = database.collections.get<ScannedItem>('scanned_items');
        await database.write(async () => {
            const batchNames = ["Cold Brew", "Milk 2%", "Orange Juice", "Red Bull", "Kombucha"];
            for (let i = 0; i < 5; i++) {
                const randomProduct = batchNames[Math.floor(Math.random() * batchNames.length)];
                await items.create((item: any) => {
                    item.pid = Math.floor(Math.random() * 10000);
                    item.name = randomProduct;
                    item.sn = Math.floor(Math.random() * 99999);
                    item.bestBeforeDate = Date.now();
                    item.packedOnDate = Date.now();
                    item.netKg = Math.floor(Math.random() * 50);
                    item.count = Math.floor(Math.random() * 12);
                });
            }
        });
    };

    const clearMockData = async () => {
        const items = database.collections.get<ScannedItem>('scanned_items');
        await database.write(async () => {
            const allItems = await items.query().fetch();
            await database.batch(...allItems.map(i => i.prepareDestroyPermanently()));
        });
    };

    return {
        filteredCooler,
        filteredFloor,
        coolerCount,
        floorCount,
        totalCount,
        chartDataMap,
        chartData,
        seedMockData,
        clearMockData,
    };
}
