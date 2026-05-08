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

    // ── Chart: product breakdown across cooler and floor ──
    const chartDataMap: Record<number, { product: string; pid: number; cooler: number; floor: number; coolerWeight: number; floorWeight: number }> = useMemo(() => {
        const map: Record<number, { product: string; pid: number; cooler: number; floor: number; coolerWeight: number; floorWeight: number }> = {};

        filteredCooler.forEach(item => {
            const pid = parseInt(item.pid, 10);
            if (!map[pid]) {
                map[pid] = { product: item.name || 'Unknown', pid, cooler: 0, floor: 0, coolerWeight: 0, floorWeight: 0 };
            }
            map[pid].cooler += (item.count ?? 1);
            if (item.netKg) {
                map[pid].coolerWeight += item.netKg;
            }
        });

        filteredFloor.forEach(item => {
            const pid = parseInt(item.pid, 10);
            if (!map[pid]) {
                map[pid] = { product: item.name || 'Unknown', pid, cooler: 0, floor: 0, coolerWeight: 0, floorWeight: 0 };
            }
            map[pid].floor += (item.weight ? 1 : (item.count ?? 0));
            if (item.weight) {
                map[pid].floorWeight += item.weight;
            }
        });

        return map;
    }, [filteredCooler, filteredFloor]);

    const chartData = useMemo(() => Object.values(chartDataMap).sort((a, b) => (b.cooler + b.floor) - (a.cooler + a.floor)), [chartDataMap]);

    return {
        filteredCooler,
        filteredFloor,
        coolerCount,
        floorCount,
        totalCount,
        chartDataMap,
        chartData,
    };
}
