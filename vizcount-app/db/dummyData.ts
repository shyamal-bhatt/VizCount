import { database } from './index';
import { ScannedItem } from './models/ScannedItem';

// Define the catalog of items with their specific rules
const CATALOG = [
    // Chicken
    { name: 'Chk Drumsticks', pid: 74818, weightRange: [15, 20], count: 6, meatType: 'Chicken' },
    { name: 'Chk Drumsticks', pid: 74819, weightRange: [5, 10], count: 8, meatType: 'Chicken' },
    { name: 'Chk Breasts', pid: 74820, weightRange: [10, 15], count: 10, meatType: 'Chicken' },
    { name: 'Chk Thighs', pid: 74821, weightRange: [10, 15], count: 12, meatType: 'Chicken' },
    // Beef
    { name: 'Beef Ribeye', pid: 85910, weightRange: [20, 25], count: 4, meatType: 'Beef' },
    { name: 'Beef Ribeye', pid: 85911, weightRange: [10, 15], count: 6, meatType: 'Beef' },
    { name: 'Beef Sirloin', pid: 85912, weightRange: [15, 20], count: 5, meatType: 'Beef' },
    { name: 'Beef Chuck', pid: 85913, weightRange: [25, 30], count: 3, meatType: 'Beef' },
    // Pork
    { name: 'Pork Chops', pid: 96020, weightRange: [15, 20], count: 8, meatType: 'Pork' },
    { name: 'Pork Chops', pid: 96021, weightRange: [8, 12], count: 12, meatType: 'Pork' },
    { name: 'Pork Ribs', pid: 96022, weightRange: [10, 15], count: 10, meatType: 'Pork' },
    { name: 'Pork Belly', pid: 96023, weightRange: [20, 25], count: 4, meatType: 'Pork' },
];

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Function to generate a realistic sequence of dates
function generateRandomDates() {
    const now = new Date();

    // Packed on date: between 1 and 30 days ago
    const packedDaysAgo = getRandomInt(1, 30);
    const packedOnDate = new Date(now.getTime() - packedDaysAgo * 24 * 60 * 60 * 1000);

    // Best before date: distribution to include near expiries (as requested by user)
    // 10% chance: expires tomorrow
    // 20% chance: expires in 2-3 days
    // 30% chance: expires in 4-7 days
    // 40% chance: expires in 8-30 days
    const rand = Math.random();
    let daysToExpiry = 0;

    if (rand < 0.1) {
        daysToExpiry = 1;
    } else if (rand < 0.3) {
        daysToExpiry = getRandomInt(2, 3);
    } else if (rand < 0.6) {
        daysToExpiry = getRandomInt(4, 7);
    } else {
        daysToExpiry = getRandomInt(8, 30);
    }

    const bestBeforeDate = new Date(now.getTime() + daysToExpiry * 24 * 60 * 60 * 1000);

    return {
        packedOnDate: packedOnDate.getTime(),
        bestBeforeDate: bestBeforeDate.getTime(),
    };
}

export async function wipeAndGenerateDummyData(count: number = 600) {
    try {
        console.log(`[DummyData] Starting generation of ${count} records...`);

        await database.write(async () => {
            // 1. Wipe existing data
            console.log(`[DummyData] Wiping existing data...`);
            const itemsCollection = database.get<ScannedItem>('scanned_items');
            const allItems = await itemsCollection.query().fetch();

            const deleteOps = allItems.map(item => item.prepareDestroyPermanently());
            await database.batch(...deleteOps);
            console.log(`[DummyData] Wiped ${allItems.length} existing records.`);

            // 2. Generate new data
            console.log(`[DummyData] Generating new records...`);
            const createOps = [];

            // Start SN from a high random number to simulate realism
            let currentSn = getRandomInt(1000000, 9000000);

            for (let i = 0; i < count; i++) {
                const itemConfig = CATALOG[getRandomInt(0, CATALOG.length - 1)];
                const weight = getRandomFloat(itemConfig.weightRange[0], itemConfig.weightRange[1]);
                const { packedOnDate, bestBeforeDate } = generateRandomDates();

                currentSn++;

                createOps.push(
                    itemsCollection.prepareCreate(item => {
                        item.sn = currentSn;
                        item.pid = itemConfig.pid;
                        item.name = itemConfig.name;
                        item.netKg = weight;
                        item.count = itemConfig.count;
                        item.packedOnDate = packedOnDate;
                        item.bestBeforeDate = bestBeforeDate;
                    })
                );

                // Batch writes in chunks to avoid overwhelming the bridge/SQLite
                if (createOps.length >= 100 || i === count - 1) {
                    await database.batch(...createOps);
                    createOps.length = 0; // Clear the array
                    console.log(`[DummyData] Progress: ${i + 1}/${count} created...`);
                }
            }
        });

        console.log(`[DummyData] Successfully generated ${count} records!`);
        return true;
    } catch (error) {
        console.error(`[DummyData] Error generating dummy data:`, error);
        return false;
    }
}
