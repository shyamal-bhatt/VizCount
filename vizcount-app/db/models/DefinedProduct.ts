import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators'

export class DefinedProduct extends Model {
    static table = 'defined_products'

    @text('name') name!: string
    @text('pid') pid!: string
    @text('gtin') gtin?: string
    @field('pack') pack!: number
    @text('type') type!: string
    /** Shelf life in days. Pre-seeded for Maple Leaf (11). Learned from OCR for others. */
    @field('shelf_life_days') shelfLifeDays?: number

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number
}
