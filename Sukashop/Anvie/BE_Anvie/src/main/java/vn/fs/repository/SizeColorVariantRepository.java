package vn.fs.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.fs.entity.ProductColor;
import vn.fs.entity.ProductSize;
import vn.fs.entity.SizeColorVariant;

@Repository
public interface SizeColorVariantRepository extends JpaRepository<SizeColorVariant, Long> {

    List<SizeColorVariant> findByProductSize(ProductSize size);

    List<SizeColorVariant> findByProductColor(ProductColor color);

    SizeColorVariant findByProductSizeAndProductColor(ProductSize size, ProductColor color);

    void deleteByProductSize(ProductSize size);

    void deleteByProductColor(ProductColor color);
}
