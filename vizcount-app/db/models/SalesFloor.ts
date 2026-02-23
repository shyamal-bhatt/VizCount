import { Model } from '@nozbe/watermelondb'
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators'

export class SalesFloor extends Model {
    static table = 'sales_floor'

    @field('pid') pid!: number
    @text('name') name!: string
    @field('count') count!: number | null
    @field('weight') weight!: number | null
    @field('expiry_date') expiryDate!: number | null

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}
