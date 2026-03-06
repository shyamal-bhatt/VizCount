import { useMemo } from 'react';
import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import { SalesFloor } from '@/db/models/SalesFloor';
import { Product } from '@/src/shared/ui/ProductPickerModal';
import { wipeAndGenerateDummyData } from '@/db/dummyData';

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

    // ── Chart: product breakdown across cooler and floor ──
    const chartDataMap: Record<number, { product: string; pid: number; cooler: number; floor: number }> = useMemo(() => {
        const map: Record<number, { product: string; pid: number; cooler: number; floor: number }> = {};

        filteredCooler.forEach(item => {
            const pid = item.pid;
            if (!map[pid]) {
                map[pid] = { product: item.name || 'Unknown', pid, cooler: 0, floor: 0 };
            }
            map[pid].cooler += (item.count ?? 1);
        });

        filteredFloor.forEach(item => {
            const pid = item.pid;
            if (!map[pid]) {
                map[pid] = { product: item.name || 'Unknown', pid, cooler: 0, floor: 0 };
            }
            map[pid].floor += (item.weight ? 1 : (item.count ?? 0));
        });

        return map;
    }, [filteredCooler, filteredFloor]);

    const chartData = useMemo(() => Object.values(chartDataMap).sort((a, b) => b.cooler - a.cooler), [chartDataMap]);

    // ── Dev tools ────────────────────────
    const seedMockData = async () => {
        await wipeAndGenerateDummyData(200);
    };

    const clearMockData = async () => {
        const items = database.collections.get<ScannedItem>('scanned_items');
        const floorItemsCollection = database.collections.get<SalesFloor>('sales_floor');
        await database.write(async () => {
            const allItems = await items.query().fetch();
            const allFloorItems = await floorItemsCollection.query().fetch();
            const deleteOps = [
                ...allItems.map(i => i.prepareDestroyPermanently()),
                ...allFloorItems.map(i => i.prepareDestroyPermanently())
            ];
            await database.batch(...deleteOps);
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
