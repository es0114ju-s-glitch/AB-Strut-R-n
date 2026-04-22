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

// Version 1: hardcoded password for demonstration purposes.
// Version 2 should use bcrypt password hashing and store
// admin credentials securely in a database.
const ADMIN_PASSWORD = 'strutraan2024';
const STRUT_SIZES = [
  '45mm', '52mm', '57mm', '60mm',
  '65mm', '70mm', '75mm', '80mm',
  '85mm', '90mm', '95mm', '100mm',
  '105mm', '110mm', '115mm', '120mm'
];

function getSuccessMessage(successCode) {
  if (successCode === 'product-added') return 'Produkten har lagts till!';
  if (successCode === 'stock-updated') return 'Lagret har uppdaterats!';
  return null;
}

function parseNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  return res.redirect('/admin/login');
}

function showAdminLogin(req, res) {
  res.render('admin-login', {
    title: 'Admin login – AB Strut & Rån',
    errorMessage: null,
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

function adminLogin(req, res) {
  const password = (req.body.password || '').toString().trim();

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).render('admin-login', {
      title: 'Admin login – AB Strut & Rån',
      errorMessage: 'Fel lösenord, försök igen',
      cartCount: req.session.cart ? req.session.cart.length : 0
    });
  }

  req.session.isAdmin = true;
  req.session.save(() => {
    res.redirect('/admin');
  });
}

function adminLogout(req, res) {
  req.session.isAdmin = false;
  req.session.save(() => {
    res.redirect('/admin/login');
  });
}

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
  const successMessage = getSuccessMessage(req.query.success);

  res.render('admin', {
    title: 'Admin – AB Strut & Rån',
    orders: allOrders,
    statusOptions: statusOptions,
    products: allProducts,
    successMessage,
    cartCount: 0 // Admin page doesn't need cart count
  });
}

function showNewProductForm(req, res) {
  res.render('admin-product-new', {
    title: 'Lägg till produkt – Admin',
    strutSizes: STRUT_SIZES,
    cartCount: 0
  });
}

function createNewProduct(req, res) {
  const {
    name,
    category,
    description,
    price,
    stock,
    image,
    pricePerSize,
    stockPerSize
  } = req.body;

  const trimmedName = (name || '').toString().trim();
  const trimmedCategory = (category || '').toString().trim();
  const trimmedDescription = (description || '').toString().trim();
  const trimmedImage = (image || '').toString().trim();

  const validCategories = ['Strutar', 'Rån', 'Bägare', 'Glassmaskiner'];
  if (!trimmedName || !validCategories.includes(trimmedCategory) || !trimmedDescription) {
    return res.redirect('/admin/products/new');
  }

  const productId = Date.now();
  const baseProduct = {
    id: productId,
    name: trimmedName,
    category: trimmedCategory,
    description: trimmedDescription,
    image: trimmedImage || '/images/placeholder.png'
  };

  if (trimmedCategory === 'Strutar') {
    const nextPricePerSize = {};
    const nextStockPerSize = {};

    for (const sizeOption of STRUT_SIZES) {
      const parsedPrice = parseNonNegativeNumber(pricePerSize && pricePerSize[sizeOption]);
      const parsedStock = parseNonNegativeNumber(stockPerSize && stockPerSize[sizeOption]);

      if (parsedPrice === null || parsedStock === null) {
        return res.redirect('/admin/products/new');
      }

      nextPricePerSize[sizeOption] = parsedPrice;
      nextStockPerSize[sizeOption] = parsedStock;
    }

    // Admin can add new products directly — no server restart needed, products.json is updated in real time
    productModel.addProduct({
      ...baseProduct,
      pricePerSize: nextPricePerSize,
      stockPerSize: nextStockPerSize,
      availableSizes: STRUT_SIZES
    });

    return res.redirect('/admin?success=product-added');
  }

  const parsedPrice = parseNonNegativeNumber(price);
  const parsedStock = parseNonNegativeNumber(stock);

  if (parsedPrice === null || parsedStock === null) {
    return res.redirect('/admin/products/new');
  }

  // Admin can add new products directly — no server restart needed, products.json is updated in real time
  productModel.addProduct({
    ...baseProduct,
    price: parsedPrice,
    stock: parsedStock
  });

  res.redirect('/admin?success=product-added');
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

function updateStock(req, res) {
  const { productId, stock, stockPerSize } = req.body;
  const product = productModel.getProductById(productId);

  if (!product) {
    return res.redirect('/admin');
  }

  if (product.category === 'Strutar') {
    const submittedStockPerSize = stockPerSize || {};
    const updatedStockPerSize = {};

    for (const sizeOption of product.availableSizes || STRUT_SIZES) {
      const parsed = parseNonNegativeNumber(submittedStockPerSize[sizeOption]);
      if (parsed === null) {
        return res.redirect('/admin');
      }
      updatedStockPerSize[sizeOption] = parsed;
    }

    // Real-time stock update — solves the case problem where stock levels were never current, forcing customers to call
    productModel.updateProductStock(productId, { stockPerSize: updatedStockPerSize });
    return res.redirect('/admin?success=stock-updated');
  }

  const parsedStock = parseNonNegativeNumber(stock);
  if (parsedStock === null) {
    return res.redirect('/admin');
  }

  // Real-time stock update — solves the case problem where stock levels were never current, forcing customers to call
  productModel.updateProductStock(productId, { stock: parsedStock });
  res.redirect('/admin?success=stock-updated');
}

function toggleStock(req, res) {
  const { productId } = req.body;

  if (!productId) {
    return res.redirect('/admin');
  }

  // Quick toggle for when a product runs out unexpectedly — staff can update from their phone
  productModel.toggleProductStock(productId);
  res.redirect('/admin?success=stock-updated');
}

module.exports = {
  showOrders,
  showAdmin,
  updateStatus,
  updatePrice,
  updateStock,
  toggleStock,
  showNewProductForm,
  createNewProduct,
  requireAdmin,
  showAdminLogin,
  adminLogin,
  adminLogout
};
