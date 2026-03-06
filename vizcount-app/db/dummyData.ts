import { database } from './index';
import { ScannedItem } from './models/ScannedItem';
import { SalesFloor } from './models/SalesFloor';
import { DefinedProduct } from './models/DefinedProduct';

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

export async function wipeAndGenerateDummyData(count: number = 200) {
    try {
        console.log(`[DummyData] Starting generation of entries based on defined_products...`);

        await database.write(async () => {
            // 1. Wipe existing data in both tables
            console.log(`[DummyData] Wiping existing data...`);
            const scannedItemsCollection = database.get<ScannedItem>('scanned_items');
            const salesFloorCollection = database.get<SalesFloor>('sales_floor');

            const allScannedItems = await scannedItemsCollection.query().fetch();
            const allSalesFloorItems = await salesFloorCollection.query().fetch();

            const deleteOps = [
                ...allScannedItems.map(item => item.prepareDestroyPermanently()),
                ...allSalesFloorItems.map(item => item.prepareDestroyPermanently())
            ];

            await database.batch(...deleteOps);
            console.log(`[DummyData] Wiped ${allScannedItems.length} scanned and ${allSalesFloorItems.length} floor records.`);

            // 2. Fetch defined products to base our data on
            const definedProductsCollection = database.collections.get<DefinedProduct>('defined_products');
            const allProducts = await definedProductsCollection.query().fetch();

            if (allProducts.length === 0) {
                console.warn(`[DummyData] No defined products found. Please wait for seedDefinedProducts to finish or restart the app.`);
                return false;
            }

            console.log(`[DummyData] Generating new records...`);
            const createOps = [];

            // Start SN from a high random number to simulate realism
            let currentSn = getRandomInt(1000000, 9000000);
            const now = new Date();

            for (let i = 0; i < count; i++) {
                const product = allProducts[getRandomInt(0, allProducts.length - 1)];
                const weight = getRandomFloat(1, 20); // Generic weight for testing

                currentSn++;

                // Determine Anomaly Type
                // 70% Normal, 10% Rotation Error, 10% Expired, 10% Uneven Count
                const randAnomaly = Math.random();

                let scannedExpiryDays = getRandomInt(8, 30);
                let floorExpiryDays = getRandomInt(1, 7);
                let scannedCount = product.pack;

                if (randAnomaly < 0.1) {
                    // Rotation Error: Cooler expires earlier than Floor
                    scannedExpiryDays = getRandomInt(1, 3);
                    floorExpiryDays = getRandomInt(4, 10);
                } else if (randAnomaly < 0.2) {
                    // Expired Product (Both strictly in the past)
                    scannedExpiryDays = getRandomInt(-10, -1);
                    floorExpiryDays = getRandomInt(-10, -1);
                } else if (randAnomaly < 0.3) {
                    // Uneven Count: User adjusted count
                    scannedCount = product.pack + getRandomInt(-2, 2);
                    if (scannedCount <= 0) scannedCount = 1;
                }

                const scannedExpiryDate = new Date(now.getTime() + scannedExpiryDays * 24 * 60 * 60 * 1000);
                const floorExpiryDate = new Date(now.getTime() + floorExpiryDays * 24 * 60 * 60 * 1000);

                // Create Scanned Item (Cooler)
                createOps.push(
                    scannedItemsCollection.prepareCreate(item => {
                        item.sn = currentSn;
                        item.pid = product.pid;
                        item.name = product.name;
                        item.netKg = weight;
                        item.count = scannedCount;
                        item.bestBeforeDate = scannedExpiryDate.getTime();
                    })
                );

                // Create Sales Floor Item
                createOps.push(
                    salesFloorCollection.prepareCreate(item => {
                        item.pid = product.pid;
                        item.name = product.name;
                        item.count = product.pack; // Floor keeps default pack usually
                        item.expiryDate = floorExpiryDate.getTime();
                    })
                );

                // Batch writes in chunks to avoid overwhelming the bridge/SQLite
                if (createOps.length >= 100 || i === count - 1) {
                    await database.batch(...createOps);
                    createOps.length = 0; // Clear the array
                    console.log(`[DummyData] Progress: ${i + 1}/${count} iterations...`);
                }
            }
        });

        console.log(`[DummyData] Successfully generated data!`);
        return true;
    } catch (error) {
        console.error(`[DummyData] Error generating dummy data:`, error);
        return false;
    }
}
