
package vn.fs.api;

import java.util.List;

import javax.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.fs.entity.Category;
import vn.fs.entity.Product;
import vn.fs.entity.ProductColor;
import vn.fs.entity.ProductImage;
import vn.fs.entity.ProductSize;
import vn.fs.entity.SizeColorVariant;
import vn.fs.repository.CategoryRepository;
import vn.fs.repository.ProductColorRepository;
import vn.fs.repository.ProductImageRepository;
import vn.fs.repository.ProductRepository;
import vn.fs.repository.ProductSizeRepository;
import vn.fs.repository.SizeColorVariantRepository;
import vn.fs.service.DatabaseMaintenanceService;
import vn.fs.service.ProductCleanupService;

@CrossOrigin("*")
@RestController
@RequestMapping("api/products")
public class ProductApi {

	@Autowired
	ProductRepository repo;

	@Autowired
	CategoryRepository cRepo;

	@Autowired
	ProductSizeRepository sizeRepo;

	@Autowired
	ProductColorRepository colorRepo;

	@Autowired
	ProductImageRepository imageRepo;

	@Autowired
	SizeColorVariantRepository variantRepo;

	@Autowired
	ProductCleanupService productCleanupService;

	@Autowired
	DatabaseMaintenanceService databaseMaintenanceService;

	@GetMapping
	public ResponseEntity<List<Product>> getAll() {
		return ResponseEntity.ok(repo.findByStatusTrue());
	}

	@GetMapping("bestseller")
	public ResponseEntity<List<Product>> getBestSeller() {
		return ResponseEntity.ok(repo.findByStatusTrueOrderBySoldDesc());
	}

	@GetMapping("bestseller-admin")
	public ResponseEntity<List<Product>> getBestSellerAdmin() {
		return ResponseEntity.ok(repo.findTop10ByOrderBySoldDesc());
	}

	@GetMapping("latest")
	public ResponseEntity<List<Product>> getLasted() {
		return ResponseEntity.ok(repo.findByStatusTrueOrderByEnteredDateDesc());
	}

	@GetMapping("rated")
	public ResponseEntity<List<Product>> getRated() {
		return ResponseEntity.ok(repo.findProductRated());
	}

	@GetMapping("suggest/{categoryId}/{productId}")
	public ResponseEntity<List<Product>> suggest(@PathVariable("categoryId") Long categoryId,
			@PathVariable("productId") Long productId) {
		return ResponseEntity.ok(repo.findProductSuggest(categoryId, productId, categoryId, categoryId));
	}

	@GetMapping("category/{id}")
	public ResponseEntity<List<Product>> getByCategory(@PathVariable("id") Long id) {
		if (!cRepo.existsById(id)) {
			return ResponseEntity.notFound().build();
		}
		Category c = cRepo.findById(id).get();
		return ResponseEntity.ok(repo.findByCategory(c));
	}

	@GetMapping("{id}")
	public ResponseEntity<Product> getById(@PathVariable("id") Long id) {
		if (!repo.existsById(id)) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(repo.findById(id).get());
	}

	@PostMapping
	@Transactional
	public ResponseEntity<Product> post(@RequestBody Product product) {
		try {
			databaseMaintenanceService.resetAutoIncrementIfEmpty("products", repo.count());
			// Check if product already exists (for update scenario)
			if (product.getProductId() != null && product.getProductId() > 0
					&& repo.existsById(product.getProductId())) {
				return ResponseEntity.badRequest().build();
			}

			// Extract and clear nested objects
			List<ProductSize> sizes = product.getSizes();
			List<ProductColor> colors = product.getColors();
			product.setSizes(null);
			product.setColors(null);
			product.setProductId(null); // Ensure new product

			// Save product first
			Product savedProduct = repo.save(product);

			// Save colors first (because variants reference colors)
			if (colors != null && !colors.isEmpty()) {
				for (ProductColor color : colors) {
					List<ProductImage> images = color.getImages();
					color.setColorId(null);
					color.setProduct(savedProduct);
					color.setImages(null);
					ProductColor savedColor = colorRepo.save(color);

					// Save images for this color
					if (images != null && !images.isEmpty()) {
						for (ProductImage image : images) {
							image.setImageId(null);
							image.setProductColor(savedColor);
							imageRepo.save(image);
						}
					}
				}
			}

			// Reload saved colors to get their IDs
			List<ProductColor> savedColors = colorRepo.findByProduct(savedProduct);

			// Save sizes and their colorVariants
			if (sizes != null && !sizes.isEmpty()) {
				for (ProductSize size : sizes) {
					List<SizeColorVariant> variants = size.getColorVariants();
					size.setSizeId(null);
					size.setProduct(savedProduct);
					size.setColorVariants(null);
					ProductSize savedSize = sizeRepo.save(size);

					// Save colorVariants for this size
					if (variants != null && !variants.isEmpty()) {
						for (SizeColorVariant variant : variants) {
							// Find matching saved color by name
							ProductColor matchingColor = null;
							if (variant.getProductColor() != null) {
								for (ProductColor sc : savedColors) {
									if (sc.getColorName() != null &&
											sc.getColorName().equals(variant.getProductColor().getColorName())) {
										matchingColor = sc;
										break;
									}
								}
							}

							if (matchingColor != null) {
								SizeColorVariant newVariant = new SizeColorVariant();
								newVariant.setProductSize(savedSize);
								newVariant.setProductColor(matchingColor);
								newVariant.setQuantity(variant.getQuantity() != null ? variant.getQuantity() : 0);
								variantRepo.save(newVariant);
							}
						}
					}
				}
			}

			return ResponseEntity.ok(repo.findById(savedProduct.getProductId()).get());
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.badRequest().build();
		}
	}

	@PutMapping("{id}")
	@Transactional
	public ResponseEntity<Product> put(@PathVariable("id") Long id, @RequestBody Product product) {
		try {
			if (!repo.existsById(id)) {
				return ResponseEntity.notFound().build();
			}

			// Get existing product
			Product existingProduct = repo.findById(id).get();

			// Update basic fields
			existingProduct.setName(product.getName());
			existingProduct.setQuantity(product.getQuantity());
			existingProduct.setPrice(product.getPrice());
			existingProduct.setDiscount(product.getDiscount());
			existingProduct.setImage(product.getImage());
			existingProduct.setDescription(product.getDescription());
			existingProduct.setEnteredDate(product.getEnteredDate());
			existingProduct.setStatus(product.getStatus());
			existingProduct.setSold(product.getSold());
			existingProduct.setCategory(product.getCategory());

			// Delete old sizes and their variants
			List<ProductSize> oldSizes = sizeRepo.findByProduct(existingProduct);
			for (ProductSize oldSize : oldSizes) {
				variantRepo.deleteByProductSize(oldSize);
				sizeRepo.delete(oldSize);
			}

			// Delete old colors and their images
			List<ProductColor> oldColors = colorRepo.findByProduct(existingProduct);
			for (ProductColor oldColor : oldColors) {
				colorRepo.delete(oldColor);
			}

			// Save updated product
			repo.save(existingProduct);

			// Save new colors
			if (product.getColors() != null) {
				for (ProductColor color : product.getColors()) {
					List<ProductImage> images = color.getImages();
					color.setColorId(null);
					color.setProduct(existingProduct);
					color.setImages(null);
					ProductColor savedColor = colorRepo.save(color);

					if (images != null && !images.isEmpty()) {
						for (ProductImage image : images) {
							image.setImageId(null);
							image.setProductColor(savedColor);
							imageRepo.save(image);
						}
					}
				}
			}

			// Reload saved colors
			List<ProductColor> savedColors = colorRepo.findByProduct(existingProduct);

			// Save new sizes and variants
			if (product.getSizes() != null) {
				for (ProductSize size : product.getSizes()) {
					List<SizeColorVariant> variants = size.getColorVariants();
					size.setSizeId(null);
					size.setProduct(existingProduct);
					size.setColorVariants(null);
					ProductSize savedSize = sizeRepo.save(size);

					if (variants != null && !variants.isEmpty()) {
						for (SizeColorVariant variant : variants) {
							ProductColor matchingColor = null;
							if (variant.getProductColor() != null) {
								for (ProductColor sc : savedColors) {
									if (sc.getColorName() != null &&
											sc.getColorName().equals(variant.getProductColor().getColorName())) {
										matchingColor = sc;
										break;
									}
								}
							}

							if (matchingColor != null) {
								SizeColorVariant newVariant = new SizeColorVariant();
								newVariant.setProductSize(savedSize);
								newVariant.setProductColor(matchingColor);
								newVariant.setQuantity(variant.getQuantity() != null ? variant.getQuantity() : 0);
								variantRepo.save(newVariant);
							}
						}
					}
				}
			}

			return ResponseEntity.ok(repo.findById(id).get());
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.badRequest().build();
		}
	}

	@DeleteMapping("{id}")
	public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
		if (!repo.existsById(id)) {
			return ResponseEntity.notFound().build();
		}
		Product p = repo.findById(id).get();
		productCleanupService.deleteProductHard(p);
		return ResponseEntity.ok().build();
	}

	// ========== SIZE ENDPOINTS ==========

	@PostMapping("{productId}/sizes")
	public ResponseEntity<ProductSize> addSize(@PathVariable("productId") Long productId,
			@RequestBody ProductSize size) {
		if (!repo.existsById(productId)) {
			return ResponseEntity.notFound().build();
		}
		Product product = repo.findById(productId).get();
		size.setProduct(product);
		return ResponseEntity.ok(sizeRepo.save(size));
	}

	@DeleteMapping("sizes/{sizeId}")
	public ResponseEntity<Void> deleteSize(@PathVariable("sizeId") Long sizeId) {
		if (!sizeRepo.existsById(sizeId)) {
			return ResponseEntity.notFound().build();
		}
		sizeRepo.deleteById(sizeId);
		return ResponseEntity.ok().build();
	}

	// ========== COLOR ENDPOINTS ==========

	@PostMapping("{productId}/colors")
	public ResponseEntity<ProductColor> addColor(@PathVariable("productId") Long productId,
			@RequestBody ProductColor color) {
		if (!repo.existsById(productId)) {
			return ResponseEntity.notFound().build();
		}
		Product product = repo.findById(productId).get();
		color.setProduct(product);
		return ResponseEntity.ok(colorRepo.save(color));
	}

	@DeleteMapping("colors/{colorId}")
	public ResponseEntity<Void> deleteColor(@PathVariable("colorId") Long colorId) {
		if (!colorRepo.existsById(colorId)) {
			return ResponseEntity.notFound().build();
		}
		colorRepo.deleteById(colorId);
		return ResponseEntity.ok().build();
	}

	// ========== IMAGE ENDPOINTS ==========

	@PostMapping("colors/{colorId}/images")
	public ResponseEntity<ProductImage> addImage(@PathVariable("colorId") Long colorId,
			@RequestBody ProductImage image) {
		if (!colorRepo.existsById(colorId)) {
			return ResponseEntity.notFound().build();
		}
		ProductColor color = colorRepo.findById(colorId).get();
		image.setProductColor(color);
		return ResponseEntity.ok(imageRepo.save(image));
	}

	@DeleteMapping("images/{imageId}")
	public ResponseEntity<Void> deleteImage(@PathVariable("imageId") Long imageId) {
		if (!imageRepo.existsById(imageId)) {
			return ResponseEntity.notFound().build();
		}
		imageRepo.deleteById(imageId);
		return ResponseEntity.ok().build();
	}
}
