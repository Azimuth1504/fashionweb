import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { ChatMessage } from 'src/app/common/ChatMessage';
import { Customer } from 'src/app/common/Customer';
import { Order } from 'src/app/common/Order';
import { Statistical } from 'src/app/common/Statistical';
import { CustomerService } from 'src/app/services/customer.service';
import { OrderService } from 'src/app/services/order.service';
import { PageService } from 'src/app/services/page.service';
import { StatisticalService } from 'src/app/services/statistical.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  orderHandle!: number;
  customerLength: number = 0;
  orders: Order[] = [];
  customers!: Customer[];

  statistical!: Statistical[];
  labels: string[] = [];
  data: number[] = [];
  year: number = new Date().getFullYear(); // Lấy năm hiện tại thay vì cố định
  myChartBar: any;
  countYears: number[] = [];

  revenueYearNow!: number;
  revenueMonthNow!: number;

  webSocket!: WebSocket;
  chatMessages: ChatMessage[] = [];

  hasData: boolean = false;
  isLoading: boolean = true;

  constructor(private pageService: PageService, private toastr: ToastrService, private orderService: OrderService, private customerService: CustomerService, private statisticalService: StatisticalService, private sessionService: SessionService) { }

  ngOnInit(): void {
    this.openWebSocket();
    this.pageService.setPageActive('dashboard');
    this.getAllOrder();
    this.getAllCustomer();
    this.getCountYear();
    Chart.register(...registerables);
  }

  ngOnDestroy(): void {
    this.closeWebSocket();
  }

  getStatisticalYear() {
    this.statisticalService.getByMothOfYear(this.year).subscribe(data => {
      this.statistical = data as Statistical[];
      this.labels = [];
      this.data = [];

      if (this.statistical && this.statistical.length > 0) {
        this.hasData = true;
        this.statistical.forEach(item => {
          this.labels.push('Tháng ' + item.month);
          this.data.push(item.amount || 0);
        })
      } else {
        this.hasData = false;
        // Tạo dữ liệu rỗng cho 12 tháng
        for (let i = 1; i <= 12; i++) {
          this.labels.push('Tháng ' + i);
          this.data.push(0);
        }
      }
      this.loadChartBar();
      this.isLoading = false;
    }, error => {
      this.isLoading = false;
      this.hasData = false;
      // Vẫn hiển thị chart rỗng
      for (let i = 1; i <= 12; i++) {
        this.labels.push('Tháng ' + i);
        this.data.push(0);
      }
      this.loadChartBar();
    })
  }

  getCountYear() {
    this.statisticalService.getCountYear().subscribe(data => {
      this.countYears = data as number[];
      // Nếu không có năm nào, thêm năm hiện tại
      if (!this.countYears || this.countYears.length === 0) {
        this.countYears = [new Date().getFullYear()];
      }
      // Sau khi có danh sách năm, lấy thống kê cho năm được chọn
      this.getStatisticalYear();
    }, error => {
      this.countYears = [new Date().getFullYear()];
      this.getStatisticalYear();
    })
  }

  getRevenueYear(year: number): number {
    let revenue = 0;
    if (this.orders && this.orders.length > 0) {
      for (let i = 0; i < this.orders.length; i++) {
        if (new Date(this.orders[i].orderDate).getFullYear() == year && this.orders[i].status == 2) {
          revenue += this.orders[i].amount;
        }
      }
    }
    return revenue;
  }

  getRevenueYearNow(): number {
    let revenue = 0;
    if (this.orders && this.orders.length > 0) {
      for (let i = 0; i < this.orders.length; i++) {
        if (new Date(this.orders[i].orderDate).getFullYear() == new Date().getFullYear() && this.orders[i].status == 2) {
          revenue += this.orders[i].amount;
        }
      }
    }
    return revenue;
  }

  getRevenueMonthNow(): number {
    let revenue = 0;
    if (this.orders && this.orders.length > 0) {
      for (let i = 0; i < this.orders.length; i++) {
        if (new Date(this.orders[i].orderDate).getMonth() == new Date().getMonth() && new Date(this.orders[i].orderDate).getFullYear() == new Date().getFullYear() && this.orders[i].status == 2) {
          revenue += this.orders[i].amount;
        }
      }
    }
    return revenue;
  }

  getAllOrder() {
    this.orderService.get().subscribe(data => {
      this.orders = data as Order[];
      this.orderHandle = 0;
      for (let i = 0; i < this.orders.length; i++) {
        if (this.orders[i].status == 0) {
          this.orderHandle++;
        }
      }
    }, error => {
      this.orders = [];
      this.orderHandle = 0;
    })
  }

  getAllCustomer() {
    this.customerService.getAll().subscribe(data => {
      this.customers = data as Customer[];
      const adminEmail = this.sessionService.getUser();
      this.customerLength = this.customers.filter(c => c.email !== adminEmail).length;
    }, error => {
      this.customerLength = 0;
    })
  }

  setYear(year: number) {
    this.year = year;
    this.labels = [];
    this.data = [];
    if (this.myChartBar) {
      this.myChartBar.destroy();
    }
    this.getStatisticalYear();
  }

  loadChartBar() {
    const ctx = document.getElementById('chart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.myChartBar) {
      this.myChartBar.destroy();
    }

    this.myChartBar = new Chart('chart', {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: this.data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)',
            'rgba(201, 203, 207, 0.2)',
            'rgba(0, 162, 71, 0.2)',
            'rgba(82, 0, 36, 0.2)',
            'rgba(82, 164, 36, 0.2)',
            'rgba(255, 158, 146, 0.2)',
            'rgba(123, 39, 56, 0.2)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(201, 203, 207, 1)',
            'rgba(0, 162, 71, 1)',
            'rgba(82, 0, 36, 1)',
            'rgba(82, 164, 36, 1)',
            'rgba(255, 158, 146, 1)',
            'rgba(123, 39, 56, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return value.toLocaleString('vi-VN') + ' đ';
              }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.parsed.y.toLocaleString('vi-VN') + ' VNĐ';
              }
            }
          }
        }
      }
    });
  }

  openWebSocket() {
    this.webSocket = new WebSocket('ws://localhost:8080/notification');

    this.webSocket.onopen = (event) => {
      // console.log('Open: ', event);
    };

    this.webSocket.onmessage = (event) => {
      this.getAllOrder();
    };

    this.webSocket.onclose = (event) => {
      // console.log('Close: ', event);
    };
  }

  closeWebSocket() {
    if (this.webSocket) {
      this.webSocket.close();
    }
  }

}
