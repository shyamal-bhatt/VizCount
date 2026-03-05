import { Model } from '@nozbe/watermelondb'
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators'

export class ScannedItem extends Model {
    static table = 'scanned_items'

    @field('pid') pid!: number
    @field('sn') sn!: number
    @text('name') name!: string
    @field('best_before_date') bestBeforeDate!: number | null
    @field('net_kg') netKg!: number | null
    @field('count') count!: number | null
    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}
