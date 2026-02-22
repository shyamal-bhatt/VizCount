import { Model } from '@nozbe/watermelondb'
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators'

export class ScannedItem extends Model {
    static table = 'scanned_items'

    @text('product_id') productId!: string
    @text('product_name') productName!: string
    @text('batch_number') batchNumber!: string
    @text('expiration_date') expirationDate!: string
    @text('raw_ocr_text') rawOcrText!: string
    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}
