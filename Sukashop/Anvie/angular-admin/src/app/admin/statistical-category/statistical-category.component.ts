import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Chart, registerables } from 'chart.js';
import { CategoryBestSeller } from 'src/app/common/CategoryBestSeller';
import { PageService } from 'src/app/services/page.service';
import { StatisticalService } from 'src/app/services/statistical.service';

@Component({
  selector: 'app-statistical-category',
  templateUrl: './statistical-category.component.html',
  styleUrls: ['./statistical-category.component.css']
})
export class StatisticalCategoryComponent implements OnInit, AfterViewInit {

  categoryBestSeller: CategoryBestSeller[] = [];
  listData!: MatTableDataSource<CategoryBestSeller>;
  lengthCategoryBestSeller: number = 0;
  columns: string[] = ['index', 'name', 'count', 'amount'];

  labelsCategory: string[] = [];
  dataMoney: number[] = [];
  dataCount: number[] = [];

  myChartPie: any;
  myChartDoughnut: any;

  isLoading: boolean = true;
  hasData: boolean = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private statisticalService: StatisticalService, private pageService: PageService) { }

  ngOnInit(): void {
    this.pageService.setPageActive('category-best-seller');
    Chart.register(...registerables);
  }

  ngAfterViewInit(): void {
    this.getCategoryBestSeller();
  }

  getCategoryBestSeller() {
    this.isLoading = true;
    this.statisticalService.getStatisticalBestSeller().subscribe(data => {
      console.log('Raw API response:', data);
      this.categoryBestSeller = data as CategoryBestSeller[];
      console.log('CategoryBestSeller array:', this.categoryBestSeller);

      // Hiển thị tất cả categories, không filter
      this.hasData = this.categoryBestSeller.length > 0;

      this.listData = new MatTableDataSource(this.categoryBestSeller);
      setTimeout(() => {
        this.listData.sort = this.sort;
        this.listData.paginator = this.paginator;
      });
      this.lengthCategoryBestSeller = this.categoryBestSeller.length;

      // Clear previous data
      this.labelsCategory = [];
      this.dataMoney = [];
      this.dataCount = [];

      // Sử dụng tất cả categories
      this.categoryBestSeller.forEach(item => {
        console.log('Category item:', item);
        this.dataMoney.push(item.amount || 0);
        this.dataCount.push(item.count || 0);
        this.labelsCategory.push(item.name || 'Unknown');
      });

      this.isLoading = false;

      console.log('Chart data - Labels:', this.labelsCategory);
      console.log('Chart data - Count:', this.dataCount);
      console.log('Chart data - Money:', this.dataMoney);
      console.log('hasData:', this.hasData);

      if (this.hasData) {
        setTimeout(() => {
          this.loadCharts();
        }, 200);
      }
    }, error => {
      this.isLoading = false;
      this.hasData = false;
      console.error('Error loading category statistics:', error);
    });
  }

  loadCharts() {
    // Destroy previous charts if exists
    if (this.myChartPie) this.myChartPie.destroy();
    if (this.myChartDoughnut) this.myChartDoughnut.destroy();

    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(201, 203, 207, 0.8)',
      'rgba(0, 162, 71, 0.8)',
      'rgba(82, 164, 136, 0.8)',
      'rgba(123, 39, 156, 0.8)'
    ];

    // Doughnut chart for revenue
    const canvasDoughnut = document.getElementById('chartDoughnut') as HTMLCanvasElement;
    if (canvasDoughnut) {
      console.log('Creating Doughnut chart');
      this.myChartDoughnut = new Chart(canvasDoughnut, {
        type: 'doughnut',
        data: {
          labels: this.labelsCategory,
          datasets: [{
            label: 'Doanh thu (VNĐ)',
            data: this.dataMoney,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.8', '1')),
            borderWidth: 2,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: { size: 11 },
                padding: 15
              }
            },
            title: {
              display: true,
              text: 'Doanh Thu Theo Loại Hàng',
              font: { size: 16, weight: 'bold' },
              padding: 20
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const value = context.parsed;
                  return ' ' + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
                }
              }
            }
          }
        }
      });
    } else {
      console.error('Doughnut canvas not found');
    }

    // Pie chart for product count
    const canvasPie = document.getElementById('chartPie') as HTMLCanvasElement;
    if (canvasPie) {
      console.log('Creating Pie chart');
      this.myChartPie = new Chart(canvasPie, {
        type: 'pie',
        data: {
          labels: this.labelsCategory,
          datasets: [{
            label: 'Số lượng bán',
            data: this.dataCount,
            backgroundColor: colors,
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { font: { size: 11 }, padding: 15 }
            },
            title: {
              display: true,
              text: 'Số Lượng Bán Theo Loại Hàng',
              font: { size: 16, weight: 'bold' },
              padding: 20
            }
          }
        }
      });
    } else {
      console.error('Pie canvas not found');
    }
  }
}
