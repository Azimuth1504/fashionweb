import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Cart } from 'src/app/common/Cart';
import { CartDetail } from 'src/app/common/CartDetail';
import { Customer } from 'src/app/common/Customer';
import { Favorites } from 'src/app/common/Favorites';
import { Product } from 'src/app/common/Product';
import { ProductColor } from 'src/app/common/ProductColor';
import { ProductImage } from 'src/app/common/ProductImage';
import { ProductSize } from 'src/app/common/ProductSize';
import { Rate } from 'src/app/common/Rate';
import { SizeColorVariant } from 'src/app/common/SizeColorVariant';
import { CartService } from 'src/app/services/cart.service';
import { CustomerService } from 'src/app/services/customer.service';
import { FavoritesService } from 'src/app/services/favorites.service';
import { ProductService } from 'src/app/services/product.service';
import { RateService } from 'src/app/services/rate.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {

  @ViewChild('confirmModal') confirmModal!: TemplateRef<any>;
  modalRef!: NgbModalRef;

  product!: Product;
  products!: Product[];
  id!: number;

  isLoading = true;

  customer!: Customer;
  favorite!: Favorites;
  favorites!: Favorites[];
  totalLike!: number;

  cart!: Cart;
  cartDetail!: CartDetail;
  cartDetails!: CartDetail[];

  rates!: Rate[];
  rateAll!: Rate[];
  countRate!: number;

  itemsComment: number = 3;

  // Chỉ để quan sát - không hiện số lượng
  selectedColor: ProductColor | null = null;
  currentImages: ProductImage[] = [];
  currentImageIndex: number = 0;

  // Modal confirm - có số lượng
  confirmSelectedSize: ProductSize | null = null;
  confirmSelectedColor: ProductColor | null = null;
  modalCurrentImages: ProductImage[] = [];
  modalImageIndex: number = 0;

  constructor(
    private productService: ProductService,
    private modalService: NgbModal,
    private cartService: CartService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private favoriteService: FavoritesService,
    private sessionService: SessionService,
    private rateService: RateService) {
    route.params.subscribe(val => {
      this.ngOnInit();
    })
  }

  slideConfig = { "slidesToShow": 7, "slidesToScroll": 2, "autoplay": true };

  ngOnInit(): void {
    this.modalService.dismissAll();
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) return;
      window.scrollTo(0, 0)
    });
    this.id = this.route.snapshot.params['id'];
    this.selectedColor = null;
    this.currentImages = [];
    this.currentImageIndex = 0;
    this.getProduct();
    this.getRates();
    this.getTotalLike();
    this.getAllRate();
  }

  setItemsComment(size: number) {
    this.getProduct();
    this.getRates();
    this.getTotalLike();
    this.getAllRate();
    this.itemsComment = size;
  }

  getProduct() {
    this.productService.getOne(this.id).subscribe(data => {
      this.isLoading = false;
      this.product = data as Product;

      // Set default color for viewing
      if (this.product.colors && this.product.colors.length > 0) {
        this.selectColor(this.product.colors[0]);
      } else {
        this.currentImages = [{ imageId: 0, imageUrl: this.product.image, displayOrder: 0 }];
      }

      this.productService.getSuggest(this.product.category.categoryId, this.product.productId).subscribe(data => {
        this.products = data as Product[];
      })
    }, error => {
      this.toastr.error('Sản phẩm không tồn tại!', 'Hệ thống');
      this.router.navigate(['/home'])
    })
  }

  // Chọn màu để xem (không hiện số lượng)
  selectColor(color: ProductColor) {
    this.selectedColor = color;
    this.currentImageIndex = 0;
    if (color.images && color.images.length > 0) {
      this.currentImages = color.images;
    } else {
      this.currentImages = [{ imageId: 0, imageUrl: this.product.image, displayOrder: 0 }];
    }
  }

  prevImage() {
    this.currentImageIndex = this.currentImageIndex > 0 ? this.currentImageIndex - 1 : this.currentImages.length - 1;
  }

  nextImage() {
    this.currentImageIndex = this.currentImageIndex < this.currentImages.length - 1 ? this.currentImageIndex + 1 : 0;
  }

  selectImage(index: number) {
    this.currentImageIndex = index;
  }

  getCurrentImage(): string {
    return this.currentImages[this.currentImageIndex]?.imageUrl || this.product?.image || '';
  }

  // === MODAL METHODS ===
  openConfirmModal() {
    let email = this.sessionService.getUser();
    if (email == null) {
      this.router.navigate(['/sign-form']);
      this.toastr.info('Hãy đăng nhập để sử dụng dịch vụ của chúng tôi', 'Hệ thống');
      return;
    }

    // Reset modal state
    this.confirmSelectedSize = this.product.sizes?.length > 0 ? this.product.sizes[0] : null;
    this.confirmSelectedColor = null;
    this.modalCurrentImages = [];
    this.modalImageIndex = 0;

    this.modalRef = this.modalService.open(this.confirmModal, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
  }

  selectConfirmSize(size: ProductSize) {
    this.confirmSelectedSize = size;

    // Kiểm tra xem size mới có chứa màu đã chọn không
    if (this.confirmSelectedColor) {
      const colorStillAvailable = size.colorVariants?.some(v =>
        (v.productColor?.colorId === this.confirmSelectedColor?.colorId ||
          v.productColor?.colorName === this.confirmSelectedColor?.colorName) &&
        v.quantity > 0
      );

      // Nếu size mới có màu đã chọn, giữ nguyên
      if (colorStillAvailable) {
        // Giữ nguyên màu và ảnh
        return;
      }
    }

    // Nếu không có màu đã chọn hoặc màu không còn trong size mới, reset
    this.confirmSelectedColor = null;
    this.modalCurrentImages = [];
    this.modalImageIndex = 0;
  }

  selectConfirmColor(color: ProductColor) {
    this.confirmSelectedColor = color;
    this.modalImageIndex = 0;
    if (color.images && color.images.length > 0) {
      this.modalCurrentImages = color.images;
    } else {
      this.modalCurrentImages = [{ imageId: 0, imageUrl: this.product.image, displayOrder: 0 }];
    }
  }

  modalPrevImage() {
    this.modalImageIndex = this.modalImageIndex > 0 ? this.modalImageIndex - 1 : this.modalCurrentImages.length - 1;
  }

  modalNextImage() {
    this.modalImageIndex = this.modalImageIndex < this.modalCurrentImages.length - 1 ? this.modalImageIndex + 1 : 0;
  }

  selectModalImage(index: number) {
    this.modalImageIndex = index;
  }

  getModalCurrentImage(): string {
    return this.modalCurrentImages[this.modalImageIndex]?.imageUrl || this.product?.image || '';
  }

  // Lấy danh sách màu có trong size đã chọn (từ colorVariants)
  getColorsForSize(): ProductColor[] {
    if (!this.confirmSelectedSize || !this.confirmSelectedSize.colorVariants) return [];
    return this.confirmSelectedSize.colorVariants
      .filter(v => v.quantity > 0)
      .map(v => v.productColor);
  }

  // Lấy số lượng của cặp size-color
  getVariantQuantity(): number {
    if (!this.confirmSelectedSize || !this.confirmSelectedColor) return 0;
    const variant = this.confirmSelectedSize.colorVariants?.find(v =>
      v.productColor?.colorId === this.confirmSelectedColor?.colorId ||
      v.productColor?.colorName === this.confirmSelectedColor?.colorName
    );
    return variant?.quantity || 0;
  }

  confirmAddCart() {
    if (!this.confirmSelectedSize) {
      this.toastr.warning('Vui lòng chọn size!', 'Thông báo');
      return;
    }

    if (!this.confirmSelectedColor) {
      this.toastr.warning('Vui lòng chọn màu sắc!', 'Thông báo');
      return;
    }

    const qty = this.getVariantQuantity();
    if (qty <= 0) {
      this.toastr.warning('Sản phẩm này đã hết hàng!', 'Thông báo');
      return;
    }

    let email = this.sessionService.getUser();
    let price = this.product.price * (1 - this.product.discount / 100);

    this.cartService.getCart(email).subscribe(data => {
      this.cart = data as Cart;
      this.cartDetail = new CartDetail(0, 1, price, new Product(this.product.productId), new Cart(this.cart.cartId));
      this.cartService.postDetail(this.cartDetail).subscribe(data => {
        this.toastr.success(
          `Size ${this.confirmSelectedSize!.sizeValue} - Màu ${this.confirmSelectedColor!.colorName}`,
          'Đã thêm vào giỏ hàng ✓'
        );
        this.cartService.getAllDetail(this.cart.cartId).subscribe(data => {
          this.cartDetails = data as CartDetail[];
          this.cartService.setLength(this.cartDetails.length);
        })
        this.modalRef.close();
      }, error => {
        this.toastr.error('Sản phẩm này có thể đã hết hàng!', 'Hệ thống');
      })
    })
  }

  addCart(productId: number, price: number) {
    this.openConfirmModal();
  }

  // === OTHER METHODS ===
  getRates() {
    this.rateService.getByProduct(this.id).subscribe(data => {
      this.rates = data as Rate[];
    })
  }

  getAllRate() {
    this.rateService.getAll().subscribe(data => {
      this.rateAll = data as Rate[];
    })
  }

  getAvgRate(id: number): number {
    let avgRating: number = 0;
    this.countRate = 0;
    for (const item of this.rateAll) {
      if (item.product.productId === id) {
        avgRating += item.rating;
        this.countRate++;
      }
    }
    return this.countRate == 0 ? 0 : Math.round(avgRating / this.countRate * 10) / 10;
  }

  toggleLike(id: number) {
    let email = this.sessionService.getUser();
    if (email == null) {
      this.router.navigate(['/sign-form']);
      this.toastr.info('Hãy đăng nhập để sử dụng dịch vụ của chúng tôi', 'Hệ thống');
      return;
    }
    this.favoriteService.getByProductIdAndEmail(id, email).subscribe(data => {
      if (data == null) {
        this.customerService.getByEmail(email).subscribe(data => {
          this.customer = data as Customer;
          this.favoriteService.post(new Favorites(0, new Customer(this.customer.userId), new Product(id))).subscribe(data => {
            this.toastr.success('Thêm thành công!', 'Hệ thống');
            this.favoriteService.getByEmail(email).subscribe(data => {
              this.favorites = data as Favorites[];
              this.favoriteService.setLength(this.favorites.length);
              this.getTotalLike();
            })
          })
        })
      } else {
        this.favorite = data as Favorites;
        this.favoriteService.delete(this.favorite.favoriteId).subscribe(data => {
          this.toastr.info('Đã xoá khỏi yêu thích!', 'Hệ thống');
          this.favoriteService.getByEmail(email).subscribe(data => {
            this.favorites = data as Favorites[];
            this.favoriteService.setLength(this.favorites.length);
            this.getTotalLike();
          })
        })
      }
    })
  }

  getTotalLike() {
    this.favoriteService.getByProduct(this.id).subscribe(data => {
      this.totalLike = data as number;
    })
  }
}
