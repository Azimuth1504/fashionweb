import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Product } from '../common/Product';
import { ProductSize } from '../common/ProductSize';
import { ProductColor } from '../common/ProductColor';
import { ProductImage } from '../common/ProductImage';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  url = "http://localhost:8080/api/products";

  constructor(private httpClient: HttpClient) { }

  getAll() {
    return this.httpClient.get(this.url);
  }

  getOne(id: number) {
    return this.httpClient.get(this.url + '/' + id);
  }

  getBestSeller() {
    return this.httpClient.get(this.url + '/bestseller-admin');
  }

  save(product: Product) {
    return this.httpClient.post(this.url, product);
  }

  update(product: Product, id: number) {
    return this.httpClient.put(this.url + '/' + id, product);
  }

  delete(id: number) {
    return this.httpClient.delete(this.url + '/' + id);
  }

  // Size endpoints
  addSize(productId: number, size: ProductSize) {
    return this.httpClient.post(this.url + '/' + productId + '/sizes', size);
  }

  deleteSize(sizeId: number) {
    return this.httpClient.delete(this.url + '/sizes/' + sizeId);
  }

  // Color endpoints
  addColor(productId: number, color: ProductColor) {
    return this.httpClient.post(this.url + '/' + productId + '/colors', color);
  }

  deleteColor(colorId: number) {
    return this.httpClient.delete(this.url + '/colors/' + colorId);
  }

  // Image endpoints
  addImage(colorId: number, image: ProductImage) {
    return this.httpClient.post(this.url + '/colors/' + colorId + '/images', image);
  }

  deleteImage(imageId: number) {
    return this.httpClient.delete(this.url + '/images/' + imageId);
  }
}
