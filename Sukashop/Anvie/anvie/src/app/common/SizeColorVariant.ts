import { ProductColor } from "./ProductColor";

export class SizeColorVariant {
    'variantId': number;
    'quantity': number;
    'productColor': ProductColor;

    constructor(color?: ProductColor, quantity?: number) {
        if (color) this.productColor = color;
        this.quantity = quantity || 0;
    }
}
