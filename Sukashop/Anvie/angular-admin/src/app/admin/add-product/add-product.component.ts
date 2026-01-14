import { Component, EventEmitter, OnInit, Output, TemplateRef } from '@angular/core';
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
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css']
})
export class AddProductComponent implements OnInit {

  product!: Product;
  url: string = 'https://res.cloudinary.com/veggie-shop/image/upload/v1633434089/products/jq4drid7ttqsxwd15xn9.jpg';
  image: string = this.url;

  postForm: FormGroup;
  categories!: Category[];

  // Step 1: Sizes
  sizes: ProductSize[] = [];
  newSize: string = '';

  // Step 2: Colors with images
  colors: ProductColor[] = [];
  newColorName: string = '';
  newColorCode: string = '#000000';

  // Step 3: Quantity matrix - lưu dạng size_color -> quantity
  quantityMatrix: { [key: string]: number } = {};

  // Upload state
  isUploading: boolean = false;
  uploadingColorIndex: number = -1;

  @Output()
  saveFinish: EventEmitter<any> = new EventEmitter<any>();

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

  // === STEP 1: SIZES ===
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
      // Khởi tạo quantity = 0 cho tất cả colors hiện có
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
    // Xóa các key liên quan trong matrix
    this.colors.forEach((_, colorIdx) => {
      const key = this.getMatrixKey(index, colorIdx);
      delete this.quantityMatrix[key];
    });
    this.sizes.splice(index, 1);
    // Rebuild matrix keys
    this.rebuildMatrixKeys();
    this.syncTotalQuantity();
  }

  // === STEP 2: COLORS + IMAGES ===
  addColor() {
    if (this.newColorName && this.newColorName.trim()) {
      const color = new ProductColor(this.newColorName.trim(), this.newColorCode);
      color.images = [];
      this.colors.push(color);
      // Khởi tạo quantity = 0 cho tất cả sizes hiện có
      this.sizes.forEach((_, sizeIdx) => {
        const key = this.getMatrixKey(sizeIdx, this.colors.length - 1);
        this.quantityMatrix[key] = 0;
      });
      this.newColorName = '';
      this.newColorCode = '#000000';
      this.syncTotalQuantity();
    } else {
      this.toastr.warning('Vui lòng nhập tên màu!', 'Thông báo');
    }
  }

  removeColor(index: number) {
    // Xóa các key liên quan trong matrix
    this.sizes.forEach((_, sizeIdx) => {
      const key = this.getMatrixKey(sizeIdx, index);
      delete this.quantityMatrix[key];
    });
    this.colors.splice(index, 1);
    // Rebuild matrix keys
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
          const img = new ProductImage(response.secure_url, this.colors[colorIndex].images.length);
          this.colors[colorIndex].images.push(img);
          this.toastr.success('Upload thành công!', 'Thông báo');
        }
      }, error => {
        this.isUploading = false;
        this.uploadingColorIndex = -1;
        this.toastr.error('Upload thất bại!', 'Lỗi');
      });
    }
  }

  removeImageFromColor(colorIndex: number, imageIndex: number) {
    this.colors[colorIndex].images.splice(imageIndex, 1);
  }

  // === STEP 3: QUANTITY MATRIX ===
  getMatrixKey(sizeIdx: number, colorIdx: number): string {
    return `${sizeIdx}_${colorIdx}`;
  }

  getQuantity(sizeIdx: number, colorIdx: number): number {
    const key = this.getMatrixKey(sizeIdx, colorIdx);
    return this.quantityMatrix[key] || 0;
  }

  setQuantity(sizeIdx: number, colorIdx: number, value: any) {
    const key = this.getMatrixKey(sizeIdx, colorIdx);
    this.quantityMatrix[key] = parseInt(value, 10) || 0;
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

  // Build colorVariants from matrix before save
  buildColorVariants() {
    this.sizes.forEach((size, sizeIdx) => {
      size.colorVariants = [];
      this.colors.forEach((color, colorIdx) => {
        const qty = this.getQuantity(sizeIdx, colorIdx);
        size.colorVariants.push(new SizeColorVariant(color, qty));
      });
    });
  }

  // === SAVE ===
  save() {
    if (this.postForm.valid) {
      if ((this.sizes.length > 0 && this.colors.length === 0)
        || (this.colors.length > 0 && this.sizes.length === 0)) {
        this.toastr.error('Vui lòng chọn đủ size và màu để đồng bộ tồn kho!', 'Hệ thống');
        return;
      }
      // Build colorVariants từ matrix
      this.buildColorVariants();

      this.product = this.postForm.value;
      this.product.category = new Category(this.postForm.value.categoryId, '');
      this.product.image = this.image;
      this.product.sizes = this.sizes;
      this.product.colors = this.colors;
      if (this.sizes.length > 0 && this.colors.length > 0) {
        this.product.quantity = this.getGrandTotal();
      }

      this.productService.save(this.product).subscribe(data => {
        this.toastr.success('Thêm thành công!', 'Hệ thống');
        this.saveFinish.emit('done');
        this.resetForm();
      }, error => {
        this.toastr.error('Thêm thất bại!', 'Hệ thống');
      })

    } else {
      this.toastr.error('Hãy kiểm tra lại dữ liệu!', 'Hệ thống');
    }
    this.modalService.dismissAll();
  }

  resetForm() {
    this.postForm.reset({
      productId: 0, status: 1, sold: 0, categoryId: 1,
      enteredDate: new Date(), discount: 0
    });
    this.image = this.url;
    this.sizes = [];
    this.colors = [];
    this.quantityMatrix = {};
    this.newSize = '';
    this.newColorName = '';
    this.newColorCode = '#000000';
  }

  getCategories() {
    this.categoryService.getAll().subscribe(data => {
      this.categories = data as Category[];
    })
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
    this.resetForm();
    this.modalService.open(content, { centered: true, size: 'xl' });
  }
}
