// =============================================================================
// ROUTES: routes.js
// =============================================================================
// WHAT IS A ROUTE?
// A route maps a URL + HTTP method to a controller function.
// Example: When a browser visits GET /products, Express finds the matching
// route here and calls productController.showProducts().
//
// WHY A SEPARATE routes.js FILE?
// Keeping all routes in one place makes it easy to see the entire site map
// at a glance. The actual logic lives in the controllers — routes just connect
// URLs to functions. Think of it as a telephone directory.
//
// HTTP METHODS:
//   GET  — User is requesting to VIEW something (navigating, clicking a link)
//   POST — User is SUBMITTING data (clicking a form button)
// =============================================================================

const express = require('express');
const router = express.Router(); // Express Router manages route definitions

// Import all controllers
const homeController    = require('./controllers/homeController');
const productController = require('./controllers/productController');
const cartController    = require('./controllers/cartController');
const orderController   = require('./controllers/orderController');

// =============================================================================
// HOME ROUTES
// =============================================================================
router.get('/', homeController.showHome);

// =============================================================================
// PRODUCT ROUTES
// =============================================================================
// List all products
router.get('/products', productController.showProducts);

// Show one product — :id is a URL parameter (e.g. /products/3 → id = "3")
router.get('/products/:id', productController.showProductDetail);

// =============================================================================
// CART ROUTES
// =============================================================================
router.get('/cart', cartController.showCart);
router.post('/cart/add', cartController.addToCart);
router.post('/cart/remove', cartController.removeFromCart);

// =============================================================================
// CHECKOUT ROUTES
// =============================================================================
router.get('/checkout', cartController.showCheckout);
router.post('/checkout', cartController.processCheckout);

// =============================================================================
// ORDER CONFIRMATION
// =============================================================================
router.get('/confirmation/:orderId', cartController.showConfirmation);

// =============================================================================
// ORDER HISTORY
// =============================================================================
router.get('/orders', orderController.showOrders);

// =============================================================================
// REORDER (B2B repeat-order feature)
// =============================================================================
// POST because it modifies session data (the cart)
router.post('/reorder/:orderId', cartController.reorder);

// =============================================================================
// ADMIN PANEL
// =============================================================================
router.get('/admin', orderController.showAdmin);
router.post('/admin/update-status', orderController.updateStatus);

// Export the router so app.js can use it
module.exports = router;
