import { useMemo } from 'react';
import { ScannedItem } from '@/db/models/ScannedItem';
import { SalesFloor } from '@/db/models/SalesFloor';

// --- Types ---

export type ExpirySource = 'cooler' | 'floor';

export interface ExpiryItem {
    id: string;
    name: string;
    pid: number;
    expiresAt: number; // Unix ms timestamp
    source: ExpirySource;
    daysUntilExpiry: number; // negative = already expired
}

export interface ExpiryBuckets {
    expired: ExpiryItem[];
    today: ExpiryItem[];
    threeDays: ExpiryItem[];
    sevenDays: ExpiryItem[];
    later: ExpiryItem[];
}

/** A FIFO rotation violation: the cooler has an earlier expiry than the floor for the same PID. */
export interface RotationAlert {
    pid: number;
    name: string;
    coolerDate: number;  // earlier (sooner-expiring) — this should be on the floor first
    floorDate: number;   // later — currently on the floor while fresher is in the cooler
    daysDiff: number;    // floorDate - coolerDate in days (always positive)
}

// --- Helpers ---

function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function daysDiff(expiresAt: number, nowStart: number): number {
    const itemStart = startOfDay(expiresAt);
    return Math.round((itemStart - nowStart) / (1000 * 60 * 60 * 24));
}

function msToDays(ms: number): number {
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

// --- Hook ---

export function useExpiryDB(
    scannedItems: ScannedItem[],
    floorItems: SalesFloor[]
): {
    items: ExpiryItem[];
    buckets: ExpiryBuckets;
    totalCount: number;
    urgentCount: number;
    rotationAlerts: RotationAlert[];
} {
    const nowStart = useMemo(() => startOfDay(Date.now()), []);

    // --- Merge both sources into unified ExpiryItem list ---
    const items: ExpiryItem[] = useMemo(() => {
        const merged: ExpiryItem[] = [];

        scannedItems.forEach((item) => {
            if (!item.bestBeforeDate) return;
            merged.push({
                id: `cooler-${item.id}`,
                name: item.name || `PID ${item.pid}`,
                pid: item.pid,
                expiresAt: item.bestBeforeDate,
                source: 'cooler',
                daysUntilExpiry: daysDiff(item.bestBeforeDate, nowStart),
            });
        });

        floorItems.forEach((item) => {
            if (!item.expiryDate) return;
            merged.push({
                id: `floor-${item.id}`,
                name: item.name || `PID ${item.pid}`,
                pid: item.pid,
                expiresAt: item.expiryDate,
                source: 'floor',
                daysUntilExpiry: daysDiff(item.expiryDate, nowStart),
            });
        });

        merged.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        return merged;
    }, [scannedItems, floorItems, nowStart]);

    // --- Bucket by urgency ---
    const buckets: ExpiryBuckets = useMemo(() => {
        const expired: ExpiryItem[] = [];
        const today: ExpiryItem[] = [];
        const threeDays: ExpiryItem[] = [];
        const sevenDays: ExpiryItem[] = [];
        const later: ExpiryItem[] = [];

        items.forEach((item) => {
            const d = item.daysUntilExpiry;
            if (d < 0) expired.push(item);
            else if (d === 0) today.push(item);
            else if (d <= 3) threeDays.push(item);
            else if (d <= 7) sevenDays.push(item);
            else later.push(item);
        });

        return { expired, today, threeDays, sevenDays, later };
    }, [items]);

    // --- Rotation alert: FIFO violation detection ---
    const rotationAlerts: RotationAlert[] = useMemo(() => {
        // PID → earliest cooler best-before date
        const coolerByPid = new Map<number, { date: number; name: string }>();
        scannedItems.forEach((item) => {
            if (!item.bestBeforeDate) return;
            const prev = coolerByPid.get(item.pid);
            if (!prev || item.bestBeforeDate < prev.date) {
                coolerByPid.set(item.pid, { date: item.bestBeforeDate, name: item.name || `PID ${item.pid}` });
            }
        });

        // PID → earliest floor expiry date
        const floorByPid = new Map<number, { date: number; name: string }>();
        floorItems.forEach((item) => {
            if (!item.expiryDate) return;
            const prev = floorByPid.get(item.pid);
            if (!prev || item.expiryDate < prev.date) {
                floorByPid.set(item.pid, { date: item.expiryDate, name: item.name || `PID ${item.pid}` });
            }
        });

        // FIFO violation: cooler has sooner expiry than floor for the same PID
        const alerts: RotationAlert[] = [];
        coolerByPid.forEach((cooler, pid) => {
            const floor = floorByPid.get(pid);
            if (!floor) return; // PID must exist on both sides to flag
            if (cooler.date < floor.date) {
                alerts.push({
                    pid,
                    name: cooler.name || floor.name,
                    coolerDate: cooler.date,
                    floorDate: floor.date,
                    daysDiff: msToDays(floor.date - cooler.date),
                });
            }
        });

        // Most severe (biggest gap) first
        alerts.sort((a, b) => b.daysDiff - a.daysDiff);
        return alerts;
    }, [scannedItems, floorItems]);

    console.log('[useExpiryDB] rotationAlerts:', rotationAlerts.length);

    const totalCount = items.length;
    const urgentCount = buckets.expired.length + buckets.today.length;

    return { items, buckets, totalCount, urgentCount, rotationAlerts };
}
