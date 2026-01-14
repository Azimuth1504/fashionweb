export class ProductImage {
    'imageId': number;
    'imageUrl': string;
    'displayOrder': number;

    constructor(imageUrl?: string, displayOrder?: number) {
        if (imageUrl) this.imageUrl = imageUrl;
        this.displayOrder = displayOrder || 0;
    }
}
