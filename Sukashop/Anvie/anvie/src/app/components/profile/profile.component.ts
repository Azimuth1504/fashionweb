import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ChatMessage } from 'src/app/common/ChatMessage';
import { Customer } from 'src/app/common/Customer';
import { Notification } from 'src/app/common/Notification';
import { Order } from 'src/app/common/Order';
import { CustomerService } from 'src/app/services/customer.service';
import { NotificationService } from 'src/app/services/notification.service';
import { OrderService } from 'src/app/services/order.service';
import { SessionService } from 'src/app/services/session.service';
import { UploadService } from 'src/app/services/upload.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  customer!: Customer;
  orders!: Order[];

  page: number = 1;
  done!: number;

  // Edit profile
  @ViewChild('editProfileModal') editProfileModal!: TemplateRef<any>;
  editModalRef!: NgbModalRef;
  editForm!: FormGroup;
  isEditing: boolean = false;
  isUploadingImage: boolean = false;
  previewImage: string = '';

  constructor(
    private customerService: CustomerService,
    private toastr: ToastrService,
    private sessionService: SessionService,
    private router: Router,
    private orderService: OrderService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private modalService: NgbModal,
    private uploadService: UploadService
  ) {
    this.initEditForm();
  }

  initEditForm() {
    this.editForm = new FormGroup({
      'name': new FormControl('', [Validators.required, Validators.minLength(2)]),
      'phone': new FormControl('', [Validators.required, Validators.pattern('^[0-9]{10,11}$')]),
      'address': new FormControl('', [Validators.required]),
      'gender': new FormControl(true),
      'image': new FormControl('')
    });
  }

  ngOnInit(): void {
    this.webSocketService.openWebSocket();
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
    this.getCustomer();
    this.getOrder();
  }

  ngOnDestroy(): void {
    this.webSocketService.closeWebSocket();
  }

  getCustomer() {
    let email = this.sessionService.getUser();
    this.customerService.getByEmail(email).subscribe(
      (data) => {
        this.customer = data as Customer;
        if (!this.customer.image) {
          this.customer.image = 'assets/img/default-avatar.png';
        }
      },
      (error) => {
        this.toastr.error('Lỗi thông tin', 'Hệ thống');
        window.location.href = '/';
      }
    );
  }

  getOrder() {
    let email = this.sessionService.getUser();
    this.orderService.get(email).subscribe(
      (data) => {
        this.orders = data as Order[];
        this.done = 0;
        this.orders.forEach((o) => {
          if (o.status === 2) {
            this.done += 1;
          }
        });
      },
      (error) => {
        this.toastr.error('Lỗi server', 'Hệ thống');
      }
    );
  }

  // ========== EDIT PROFILE ==========
  openEditProfile() {
    this.previewImage = this.customer.image;
    this.editForm.patchValue({
      name: this.customer.name,
      phone: this.customer.phone,
      address: this.customer.address,
      gender: this.customer.gender,
      image: this.customer.image
    });
    this.editModalRef = this.modalService.open(this.editProfileModal, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
  }

  onProfileImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingImage = true;
      this.uploadService.uploadCustomer(file).subscribe(
        (response: any) => {
          this.isUploadingImage = false;
          if (response && response.secure_url) {
            this.previewImage = response.secure_url;
            this.editForm.patchValue({ image: response.secure_url });
            this.toastr.success('Tải ảnh thành công!', 'Hệ thống');
          }
        },
        (error: any) => {
          this.isUploadingImage = false;
          this.toastr.error('Lỗi tải ảnh!', 'Hệ thống');
        }
      );
    }
  }

  saveProfile() {
    if (this.editForm.invalid) {
      this.toastr.warning('Vui lòng điền đầy đủ thông tin!', 'Thông báo');
      return;
    }

    this.isEditing = true;
    const updatedCustomer: Customer = {
      ...this.customer,
      name: this.editForm.value.name,
      phone: this.editForm.value.phone,
      address: this.editForm.value.address,
      gender: this.editForm.value.gender,
      image: this.editForm.value.image || this.customer.image
    };

    this.customerService.update(this.customer.userId, updatedCustomer).subscribe(
      (data) => {
        this.isEditing = false;
        this.customer = data as Customer;
        if (!this.customer.image) {
          this.customer.image = 'assets/img/default-avatar.png';
        }
        this.toastr.success('Cập nhật thông tin thành công!', 'Hệ thống');
        this.editModalRef.close();
      },
      (error) => {
        this.isEditing = false;
        this.toastr.error('Lỗi cập nhật thông tin!', 'Hệ thống');
      }
    );
  }

  // ========== ORDER ACTIONS ==========
  cancel(id: number) {
    if (id === -1) {
      return;
    }
    Swal.fire({
      title: 'Bạn có muốn huỷ đơn hàng này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Không',
      confirmButtonText: 'Huỷ',
    }).then((result) => {
      if (result.isConfirmed) {
        this.orderService.cancel(id).subscribe(
          (data) => {
            this.getOrder();
            this.sendMessage(id);
            this.toastr.success('Huỷ đơn hàng thành công!', 'Hệ thống');
          },
          (error) => {
            this.toastr.error('Lỗi server', 'Hệ thống');
          }
        );
      }
    });
  }

  sendMessage(id: number) {
    let chatMessage = new ChatMessage(
      this.customer.name,
      ' đã huỷ một đơn hàng'
    );
    this.notificationService
      .post(
        new Notification(
          0,
          this.customer.name + ' đã huỷ một đơn hàng (' + id + ')'
        )
      )
      .subscribe((data) => {
        this.webSocketService.sendMessage(chatMessage);
      });
  }

  finish() {
    this.ngOnInit();
  }
}
