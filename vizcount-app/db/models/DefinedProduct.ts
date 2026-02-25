import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class DefinedProduct extends Model {
    static table = 'defined_products'

    @field('name') name!: string
    @field('pid') pid!: number
    @field('pack') pack!: number
    @field('type') type!: string

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number
}
