import { SizeColorVariant } from "./SizeColorVariant";

export class ProductSize {
    'sizeId': number;
    'sizeValue': string;
    'colorVariants': SizeColorVariant[];

    constructor(sizeValue: string) {
        this.sizeValue = sizeValue;
        this.colorVariants = [];
    }
}
