import { ProductImage } from "./ProductImage";

export class ProductColor {
    'colorId': number;
    'colorName': string;
    'colorCode': string;
    'images': ProductImage[];

    constructor(colorName: string, colorCode: string) {
        this.colorName = colorName;
        this.colorCode = colorCode;
        this.images = [];
    }
}
