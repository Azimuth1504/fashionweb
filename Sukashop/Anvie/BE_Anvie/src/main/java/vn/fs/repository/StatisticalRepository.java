
package vn.fs.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import vn.fs.entity.Product;

@Repository
public interface StatisticalRepository extends JpaRepository<Product, Long> {

	@Query(value = "select sum(amount), month(order_date) from orders where year(order_date) = ? and status = 2 group by month(order_date)", nativeQuery = true)
	List<Object[]> getMonthOfYear(int year);

	@Query(value = "select year(order_date) from orders group by year(order_date)", nativeQuery = true)
	List<Integer> getYears();

	@Query(value = "select sum(amount) from orders where year(order_date) = ? and status = 2", nativeQuery = true)
	Double getRevenueByYear(int year);

	@Query(value = "SELECT COALESCE(SUM(p.sold), 0), c.category_name, COALESCE(SUM(p.price * p.sold * (100 - COALESCE(p.discount, 0)) / 100), 0) "
			+
			"FROM categories c " +
			"LEFT JOIN products p ON p.category_id = c.category_id " +
			"GROUP BY c.category_id, c.category_name " +
			"ORDER BY SUM(p.sold) DESC", nativeQuery = true)
	List<Object[]> getCategoryBestSeller();

}
