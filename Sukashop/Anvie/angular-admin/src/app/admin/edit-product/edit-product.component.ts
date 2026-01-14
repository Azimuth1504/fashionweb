import { Component, EventEmitter, Input, OnInit, Output, TemplateRef } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Category } from 'src/app/common/Category';
import { Product } from 'src/app/common/Product';
import { ProductColor } from 'src/app/common/ProductColor';
import { ProductImage } from 'src/app/common/ProductImage';
import { ProductSize } from 'src/app/common/ProductSize';
import { SizeColorVariant } from 'src/app/common/SizeColorVariant';
import { CategoryService } from 'src/app/services/category.service';
import { ProductService } from 'src/app/services/product.service';
import { UploadService } from 'src/app/services/upload.service';

@Component({
  selector: 'app-edit-product',
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.css']
})
export class EditProductComponent implements OnInit {

  product!: Product;
  url: string = 'https://res.cloudinary.com/veggie-shop/image/upload/v1633434089/products/jq4drid7ttqsxwd15xn9.jpg';
  image: string = this.url;

  postForm: FormGroup;
  categories!: Category[];

  sizes: ProductSize[] = [];
  newSize: string = '';

  colors: ProductColor[] = [];
  newColorName: string = '';
  newColorCode: string = '#000000';

  quantityMatrix: { [key: string]: number } = {};

  isUploading: boolean = false;
  uploadingColorIndex: number = -1;

  @Input() id!: number;
  @Output() editFinish: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private modalService: NgbModal,
    private categoryService: CategoryService,
    private productService: ProductService,
    private toastr: ToastrService,
    private uploadService: UploadService) {
    this.postForm = new FormGroup({
      'productId': new FormControl(0),
      'name': new FormControl(null, [Validators.minLength(4), Validators.required]),
      'quantity': new FormControl(null, [Validators.min(1), Validators.required]),
      'price': new FormControl(null, [Validators.required, Validators.min(1000)]),
      'discount': new FormControl(null, [Validators.required, Validators.min(0), Validators.max(80)]),
      'description': new FormControl(null, Validators.required),
      'enteredDate': new FormControl(new Date()),
      'categoryId': new FormControl(1),
      'status': new FormControl(1),
      'sold': new FormControl(0),
    })
  }

  ngOnInit(): void {
    this.getCategories();
    this.getProduct();
  }

  private normalizeSizeValue(value: string): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const sizeNumber = Number(trimmed);
    if (!Number.isInteger(sizeNumber) || sizeNumber < 35 || sizeNumber > 45) {
      return null;
    }
    return String(sizeNumber);
  }

  private syncTotalQuantity(): void {
    if (this.sizes.length > 0 && this.colors.length > 0) {
      this.postForm.patchValue({ quantity: this.getGrandTotal() }, { emitEvent: false });
    }
  }

  addSize() {
    const sizeValue = this.normalizeSizeValue(this.newSize);
    if (sizeValue) {
      if (this.sizes.some(item => item.sizeValue === sizeValue)) {
        this.toastr.warning('Size đã tồn tại!', 'Thông báo');
        return;
      }
      const size = new ProductSize(sizeValue);
      size.colorVariants = [];
      this.sizes.push(size);
      this.colors.forEach((_, colorIdx) => {
        const key = this.getMatrixKey(this.sizes.length - 1, colorIdx);
        this.quantityMatrix[key] = 0;
      });
      this.newSize = '';
      this.syncTotalQuantity();
    } else {
      this.toastr.warning('Size phải là số nguyên từ 35 đến 45!', 'Thông báo');
    }
  }

  removeSize(index: number) {
    this.colors.forEach((_, colorIdx) => {
      delete this.quantityMatrix[this.getMatrixKey(index, colorIdx)];
    });
    this.sizes.splice(index, 1);
    this.rebuildMatrixKeys();
    this.syncTotalQuantity();
  }

  addColor() {
    if (this.newColorName && this.newColorName.trim()) {
      const color = new ProductColor(this.newColorName.trim(), this.newColorCode);
      color.images = [];
      this.colors.push(color);
      this.sizes.forEach((_, sizeIdx) => {
        const key = this.getMatrixKey(sizeIdx, this.colors.length - 1);
        this.quantityMatrix[key] = 0;
      });
      this.newColorName = '';
      this.newColorCode = '#000000';
      this.syncTotalQuantity();
    }
  }

  removeColor(index: number) {
    this.sizes.forEach((_, sizeIdx) => {
      delete this.quantityMatrix[this.getMatrixKey(sizeIdx, index)];
    });
    this.colors.splice(index, 1);
    this.rebuildMatrixKeys();
    this.syncTotalQuantity();
  }

  rebuildMatrixKeys() {
    const newMatrix: { [key: string]: number } = {};
    this.sizes.forEach((_, sizeIdx) => {
      this.colors.forEach((_, colorIdx) => {
        const key = this.getMatrixKey(sizeIdx, colorIdx);
        newMatrix[key] = this.quantityMatrix[key] || 0;
      });
    });
    this.quantityMatrix = newMatrix;
    this.syncTotalQuantity();
  }

  onColorImageSelect(event: any, colorIndex: number) {
    const file = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.uploadingColorIndex = colorIndex;
      this.uploadService.uploadProduct(file).subscribe(response => {
        this.isUploading = false;
        this.uploadingColorIndex = -1;
        if (response) {
          this.colors[colorIndex].images.push(new ProductImage(response.secure_url, this.colors[colorIndex].images.length));
        }
      }, () => { this.isUploading = false; this.uploadingColorIndex = -1; });
    }
  }

  removeImageFromColor(colorIndex: number, imageIndex: number) {
    this.colors[colorIndex].images.splice(imageIndex, 1);
  }

  getMatrixKey(sizeIdx: number, colorIdx: number): string {
    return `${sizeIdx}_${colorIdx}`;
  }

  getQuantity(sizeIdx: number, colorIdx: number): number {
    return this.quantityMatrix[this.getMatrixKey(sizeIdx, colorIdx)] || 0;
  }

  setQuantity(sizeIdx: number, colorIdx: number, value: any) {
    this.quantityMatrix[this.getMatrixKey(sizeIdx, colorIdx)] = parseInt(value, 10) || 0;
    this.syncTotalQuantity();
  }

  getSizeTotal(sizeIdx: number): number {
    let total = 0;
    this.colors.forEach((_, colorIdx) => {
      total += this.getQuantity(sizeIdx, colorIdx);
    });
    return total;
  }

  getColorTotal(colorIdx: number): number {
    let total = 0;
    this.sizes.forEach((_, sizeIdx) => {
      total += this.getQuantity(sizeIdx, colorIdx);
    });
    return total;
  }

  getGrandTotal(): number {
    let total = 0;
    Object.values(this.quantityMatrix).forEach(qty => {
      total += qty || 0;
    });
    return total;
  }

  buildColorVariants() {
    this.sizes.forEach((size, sizeIdx) => {
      size.colorVariants = [];
      this.colors.forEach((color, colorIdx) => {
        const qty = this.getQuantity(sizeIdx, colorIdx);
        size.colorVariants.push(new SizeColorVariant(color, qty));
      });
    });
  }

  update() {
    if (this.postForm.valid) {
      if ((this.sizes.length > 0 && this.colors.length === 0)
        || (this.colors.length > 0 && this.sizes.length === 0)) {
        this.toastr.error('Vui lòng chọn đủ size và màu để đồng bộ tồn kho!', 'Hệ thống');
        return;
      }
      this.buildColorVariants();

      this.product = this.postForm.value;
      this.product.category = new Category(this.postForm.value.categoryId, '');
      this.product.image = this.image;
      this.product.sizes = this.sizes;
      this.product.colors = this.colors;
      if (this.sizes.length > 0 && this.colors.length > 0) {
        this.product.quantity = this.getGrandTotal();
      }

      this.productService.update(this.product, this.id).subscribe(() => {
        this.toastr.success('Cập nhật thành công!', 'Hệ thống');
        this.editFinish.emit('done');
      }, () => this.toastr.error('Cập nhật thất bại!', 'Hệ thống'));
    }
    this.modalService.dismissAll();
  }

  getProduct() {
    this.productService.getOne(this.id).subscribe(data => {
      this.product = data as Product;
      this.postForm.patchValue({
        productId: this.product.productId,
        name: this.product.name,
        quantity: this.product.quantity,
        price: this.product.price,
        discount: this.product.discount,
        description: this.product.description,
        enteredDate: this.product.enteredDate,
        categoryId: this.product.category.categoryId,
        sold: this.product.sold,
      });
      this.image = this.product.image;

      // Load colors
      this.colors = [];
      if (this.product.colors) {
        this.product.colors.forEach(c => {
          const color = new ProductColor(c.colorName, c.colorCode);
          color.colorId = c.colorId;
          color.images = c.images?.map(img => new ProductImage(img.imageUrl, img.displayOrder)) || [];
          this.colors.push(color);
        });
      }

      // Load sizes and build matrix
      this.sizes = [];
      this.quantityMatrix = {};
      if (this.product.sizes) {
        this.product.sizes.forEach((s, sizeIdx) => {
          const size = new ProductSize(s.sizeValue);
          size.sizeId = s.sizeId;
          size.colorVariants = [];
          this.sizes.push(size);

          // Build matrix from variants
          this.colors.forEach((color, colorIdx) => {
            const existingVariant = s.colorVariants?.find(v =>
              v.productColor?.colorName === color.colorName || v.productColor?.colorId === color.colorId
            );
            const key = this.getMatrixKey(sizeIdx, colorIdx);
            this.quantityMatrix[key] = existingVariant?.quantity || 0;
          });
        });
      }
      this.syncTotalQuantity();
    });
  }

  getCategories() {
    this.categoryService.getAll().subscribe(data => this.categories = data as Category[]);
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.uploadService.uploadProduct(file).subscribe(response => {
        this.isUploading = false;
        if (response) this.image = response.secure_url;
      }, () => this.isUploading = false);
    }
  }

  open(content: TemplateRef<any>) {
    this.getProduct();
    this.modalService.open(content, { centered: true, size: 'xl' });
  }
}
