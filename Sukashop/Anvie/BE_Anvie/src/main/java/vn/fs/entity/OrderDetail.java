
package vn.fs.entity;

import java.io.Serializable;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Column;
import javax.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@SuppressWarnings("serial")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "orderDetails")
public class OrderDetail implements Serializable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long orderDetailId;
	private int quantity;
	private Double price;

	@Column(name = "product_name")
	private String productName;

	@Column(name = "product_image")
	private String productImage;

	@ManyToOne
	@JoinColumn(name = "productId")
	private Product product;

	@ManyToOne
	@JoinColumn(name = "orderId")
	private Order order;

	public OrderDetail(Long orderDetailId, int quantity, Double price, Product product, Order order) {
		this.orderDetailId = orderDetailId;
		this.quantity = quantity;
		this.price = price;
		this.product = product;
		this.order = order;
	}

	public String getDisplayProductName() {
		if (product != null && product.getName() != null) {
			return product.getName();
		}
		return productName;
	}

	public String getDisplayProductImage() {
		if (product != null && product.getImage() != null) {
			return product.getImage();
		}
		return productImage;
	}
}
