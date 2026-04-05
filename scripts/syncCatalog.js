const mongoose = require('mongoose');

const connectDb = require('../configDb');
const ApiCatalogItem = require('../models/ApiCatalogItem');
const CatalogPurchase = require('../models/CatalogPurchase');
const {
    curatedCatalogItems,
    curatedCatalogSlugs,
    isLegacyTestCatalogItem
} = require('../seeds/catalogSeedData');

const dryRun = process.argv.includes('--dry-run');

async function main() {
    await connectDb();

    const existingItems = await ApiCatalogItem.find({}, 'name slug').lean();
    const removableItems = existingItems.filter((item) => {
        const slug = String(item.slug || '').toLowerCase();
        return !curatedCatalogSlugs.includes(slug) && isLegacyTestCatalogItem(item);
    });
    const removableIds = removableItems.map((item) => item._id);

    if (dryRun) {
        console.log(`[dry-run] Would remove ${removableItems.length} test or placeholder products.`);
    } else if (removableIds.length) {
        const purchaseResult = await CatalogPurchase.deleteMany({
            catalogItemId: { $in: removableIds }
        });
        const deleteResult = await ApiCatalogItem.deleteMany({
            _id: { $in: removableIds }
        });

        console.log(
            `Removed ${deleteResult.deletedCount} test products and ${purchaseResult.deletedCount} related purchases.`
        );
    } else {
        console.log('No removable test products found.');
    }

    let upsertCount = 0;
    for (const item of curatedCatalogItems) {
        if (dryRun) {
            upsertCount += 1;
            continue;
        }

        await ApiCatalogItem.findOneAndUpdate(
            { slug: item.slug },
            { $set: item },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        upsertCount += 1;
    }

    const catalogPreview = curatedCatalogItems.map((item) => ({
        slug: item.slug,
        name: item.name,
        type: item.type,
        billingModel: item.billingModel
    }));

    console.log(
        `${dryRun ? 'Prepared' : 'Upserted'} ${upsertCount} curated catalog products.`
    );
    console.log(JSON.stringify(catalogPreview, null, 2));
}

main()
    .catch((error) => {
        console.error(error.message || 'Catalog sync failed');
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch (error) {
            // Ignore disconnect errors on process shutdown.
        }
    });
