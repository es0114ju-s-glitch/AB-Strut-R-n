// =============================================================================
// CONTROLLER: productController.js
// =============================================================================
// Handles all product-related pages:
//   - Product listing (/products)
//   - Single product detail (/products/:id)
// =============================================================================

const productModel = require('../models/productModel');

// -----------------------------------------------------------------------------
// showProducts(req, res)
// GET /products — renders the full product catalogue with filter buttons.
// -----------------------------------------------------------------------------
function showProducts(req, res) {
  const allProducts = productModel.getAllProducts();

  res.render('products', {
    title: 'Produkter – AB Strut & Rån',
    products: allProducts,
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

// -----------------------------------------------------------------------------
// showProductDetail(req, res)
// GET /products/:id — renders a single product's detail page.
//
// req.params.id contains the :id from the URL.
// Example: visiting /products/3 sets req.params.id = "3"
// -----------------------------------------------------------------------------
function showProductDetail(req, res) {
  const product = productModel.getProductById(req.params.id);

  // If no product found with this ID, send a 404 (Not Found) response
  if (!product) {
    return res.status(404).render('404', {
      title: 'Produkten hittades inte',
      cartCount: req.session.cart ? req.session.cart.length : 0
    });
  }

  res.render('product-detail', {
    title: `${product.name} – AB Strut & Rån`,
    product: product,
    addedToCart: req.query.added === '1',
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

// -----------------------------------------------------------------------------
// showSearch(req, res)
// GET /search?q=... — search products by name or article number
// -----------------------------------------------------------------------------
function showSearch(req, res) {
  const q = req.query.q || '';
  const results = q.trim() ? productModel.search(q, { limit: 50 }) : [];

  res.render('search', {
    title: `Sök: ${q}`,
    query: q,
    results: results,
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

// -----------------------------------------------------------------------------
// showSuggest(req, res)
// GET /search/suggest?q=... — returns JSON suggestions for autocomplete
// -----------------------------------------------------------------------------
function showSuggest(req, res) {
  const q = (req.query.q || '').toString();
  if (!q.trim()) return res.json([]);

  const results = productModel.search(q, { limit: 10 });

  const suggestions = results.map(p => ({
    id: p.id,
    name: p.name,
    articleNumber: p.articleNumber || '',
    price: p.price || 0
  }));

  res.json(suggestions);
}

module.exports = { showProducts, showProductDetail, showSearch, showSuggest };
