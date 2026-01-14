export class ProductImage {
    'imageId': number;
    'imageUrl': string;
    'displayOrder': number;

    constructor(imageUrl: string, displayOrder: number = 0) {
        this.imageUrl = imageUrl;
        this.displayOrder = displayOrder;
    }
}
