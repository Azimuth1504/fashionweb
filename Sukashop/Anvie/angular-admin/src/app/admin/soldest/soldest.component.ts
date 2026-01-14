import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Chart, registerables } from 'chart.js';
import { Product } from 'src/app/common/Product';
import { PageService } from 'src/app/services/page.service';
import { ProductService } from 'src/app/services/product.service';

@Component({
  selector: 'app-soldest',
  templateUrl: './soldest.component.html',
  styleUrls: ['./soldest.component.css']
})
export class SoldestComponent implements OnInit, AfterViewInit {

  listData!: MatTableDataSource<Product>;
  products: Product[] = [];
  productsLength: number = 0;
  columns: string[] = ['image', 'productId', 'name', 'sold', 'category'];

  labels: string[] = [];
  data: number[] = [];
  myChartBar: any;

  isLoading: boolean = true;
  hasData: boolean = false;
  canvasReady: boolean = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private pageService: PageService, private productService: ProductService) { }

  ngOnInit(): void {
    this.pageService.setPageActive('soldest');
    Chart.register(...registerables);
  }

  ngAfterViewInit(): void {
    this.canvasReady = true;
    this.getProduct();
  }

  getProduct() {
    this.isLoading = true;
    this.productService.getBestSeller().subscribe(data => {
      this.products = data as Product[];
      this.productsLength = this.products.length;

      // Filter products with sold > 0
      const productsWithSales = this.products.filter(p => p.sold > 0);
      this.hasData = productsWithSales.length > 0;

      this.listData = new MatTableDataSource(this.products);

      // Set sort and paginator after view init
      setTimeout(() => {
        this.listData.sort = this.sort;
        this.listData.paginator = this.paginator;
      });

      // Clear previous data
      this.labels = [];
      this.data = [];

      // Get top 10 products with sales
      const topProducts = productsWithSales.slice(0, Math.min(10, productsWithSales.length));
      topProducts.forEach(product => {
        const name = product.name.length > 20 ? product.name.substring(0, 18) + '...' : product.name;
        this.labels.push(name);
        this.data.push(product.sold);
      });

      this.isLoading = false;

      // Wait for DOM to update then render chart
      if (this.hasData) {
        setTimeout(() => {
          this.loadChartBar();
        }, 100);
      }
    }, error => {
      this.isLoading = false;
      this.hasData = false;
      console.error('Error loading products:', error);
    });
  }

  loadChartBar() {
    // Destroy previous chart if exists
    if (this.myChartBar) {
      this.myChartBar.destroy();
    }

    const canvas = document.getElementById('chart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    console.log('Creating chart with data:', this.labels, this.data);

    this.myChartBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [{
          label: 'Số lượng bán được',
          data: this.data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(201, 203, 207, 0.7)',
            'rgba(0, 162, 71, 0.7)',
            'rgba(82, 164, 136, 0.7)',
            'rgba(123, 39, 156, 0.7)'
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
            'rgba(82, 164, 136, 1)',
            'rgba(123, 39, 156, 1)'
          ],
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          title: {
            display: true,
            text: 'Top 10 Sản Phẩm Bán Chạy Nhất',
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: 20
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Số lượng bán'
            }
          },
          y: {
            ticks: {
              font: {
                size: 11
              }
            }
          }
        }
      }
    });
  }
}
