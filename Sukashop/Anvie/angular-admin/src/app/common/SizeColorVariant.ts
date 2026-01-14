import { ProductColor } from "./ProductColor";

export class SizeColorVariant {
    'variantId': number;
    'quantity': number;
    'productColor': ProductColor;

    constructor(color: ProductColor, quantity: number = 0) {
        this.productColor = color;
        this.quantity = quantity;
    }
}
