import { ProductImage } from "./ProductImage";

export class ProductColor {
    'colorId': number;
    'colorName': string;
    'colorCode': string;
    'images': ProductImage[];

    constructor(colorName?: string, colorCode?: string) {
        if (colorName) this.colorName = colorName;
        if (colorCode) this.colorCode = colorCode;
        this.images = [];
    }
}
