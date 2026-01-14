import { SizeColorVariant } from "./SizeColorVariant";

export class ProductSize {
    'sizeId': number;
    'sizeValue': string;
    'colorVariants': SizeColorVariant[];

    constructor(sizeValue?: string) {
        if (sizeValue) this.sizeValue = sizeValue;
        this.colorVariants = [];
    }
}
