
package vn.fs.entity;

import java.io.Serializable;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Bảng trung gian lưu số lượng cho mỗi cặp Size-Color
 * Ví dụ: Size 38 - Màu Đen: 10 sản phẩm
 * Size 38 - Màu Trắng: 5 sản phẩm
 */
@SuppressWarnings("serial")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "size_color_variants")
public class SizeColorVariant implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long variantId;

    private Integer quantity = 0;

    @ManyToOne
    @JoinColumn(name = "sizeId")
    @JsonIgnore
    private ProductSize productSize;

    @ManyToOne
    @JoinColumn(name = "colorId")
    private ProductColor productColor;

    public SizeColorVariant(ProductSize size, ProductColor color, Integer quantity) {
        this.productSize = size;
        this.productColor = color;
        this.quantity = quantity != null ? quantity : 0;
    }
}
