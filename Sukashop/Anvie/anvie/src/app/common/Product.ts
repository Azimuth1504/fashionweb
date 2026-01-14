import { Category } from "./Category";
import { ProductColor } from "./ProductColor";
import { ProductSize } from "./ProductSize";

export class Product {
    'productId': number;
    'name': string;
    'quantity': number;
    'price': number;
    'discount': number;
    'image': string;
    'description': string;
    'enteredDate': Date;
    'category': Category;
    'status': boolean;
    'sold': number;
    'sizes': ProductSize[];
    'colors': ProductColor[];

    constructor(id?: number) {
        if (id) {
            this.productId = id;
        }
        this.sizes = [];
        this.colors = [];
    }
}
