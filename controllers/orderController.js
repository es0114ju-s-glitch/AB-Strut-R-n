// =============================================================================
// CONTROLLER: orderController.js
// =============================================================================
// Handles:
//   - Order history for customers (/orders)
//   - Admin panel for staff (/admin)
//   - Status updates (POST /admin/update-status)
// =============================================================================

const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');

// -----------------------------------------------------------------------------
// showOrders(req, res)
// GET /orders?customer=KUNDNUMMER — order history for a specific customer.
//
// The customer number comes from the URL query string: ?customer=K1042
// req.query.customer reads that value.
// -----------------------------------------------------------------------------
function showOrders(req, res) {
  const queryCustomer = (req.query.customer || '').trim();
  const customerNumber = queryCustomer || (req.session.customerNumber || '');
  let orders = [];

  // Only look up orders if a customer number was actually provided
  if (customerNumber !== '') {
    orders = orderModel.getOrdersByCustomer(customerNumber);
  }

  res.render('orders', {
    title: 'Mina ordrar – AB Strut & Rån',
    orders: orders,
    customerNumber: customerNumber,
    searched: customerNumber !== '',
    fromSession: queryCustomer === '' && customerNumber !== '',
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

// -----------------------------------------------------------------------------
// showAdmin(req, res)
// GET /admin — shows all orders with status-update dropdowns.
//
// WHY IS STATUS VISIBILITY IMPORTANT? (from the case)
// Without this, customers call the office to ask "Has my order shipped?"
// Giving customers real-time order status online means fewer phone calls,
// happier customers, and less admin work for staff.
// Even in this simplified admin (no login), staff can update order status
// and customers can see it via the /orders page.
// -----------------------------------------------------------------------------
function showAdmin(req, res) {
  // Why real-time status matters (from the case): customers and staff need
  // to know delivery status without calling. This admin view lets staff
  // update statuses so the /orders page shows accurate info.
  const allOrders = orderModel.getAllOrders();

  // Status options for the dropdown — maps to badge colours in the views
  const statusOptions = ['Mottagen', 'Behandlas', 'Skickad', 'Levererad'];
  const allProducts = productModel.getAllProducts();

  res.render('admin', {
    title: 'Admin – AB Strut & Rån',
    orders: allOrders,
    statusOptions: statusOptions,
    products: allProducts,
    cartCount: 0 // Admin page doesn't need cart count
  });
}

// -----------------------------------------------------------------------------
// updateStatus(req, res)
// POST /admin/update-status — updates one order's delivery status.
// -----------------------------------------------------------------------------
function updateStatus(req, res) {
  const { orderId, status } = req.body;

  // Valid statuses — we validate on the server side too (not just the form)
  const validStatuses = ['Mottagen', 'Behandlas', 'Skickad', 'Levererad'];

  if (!validStatuses.includes(status)) {
    // Invalid status submitted — redirect without updating
    return res.redirect('/admin');
  }

  orderModel.updateOrderStatus(orderId, status);

  // Redirect back to admin page after update
  res.redirect('/admin');
}

function updatePrice(req, res) {
  const { productId, price, pricePerSize } = req.body;
  const product = productModel.getProductById(productId);

  if (!product) {
    return res.redirect('/admin');
  }

  // Solves the case problem: prices on the old site were never updated, forcing staff to call customers to correct them
  if (product.category === 'Strutar') {
    const submittedPricePerSize = pricePerSize || {};
    const updatedPricePerSize = {};

    for (const sizeOption of product.availableSizes || []) {
      const parsed = Number(submittedPricePerSize[sizeOption]);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.redirect('/admin');
      }
      updatedPricePerSize[sizeOption] = parsed;
    }

    productModel.updateProductPrice(productId, { pricePerSize: updatedPricePerSize });
    return res.redirect('/admin');
  }

  const parsedPrice = Number(price);

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return res.redirect('/admin');
  }

  productModel.updateProductPrice(productId, { price: parsedPrice });
  res.redirect('/admin');
}

module.exports = { showOrders, showAdmin, updateStatus, updatePrice };
