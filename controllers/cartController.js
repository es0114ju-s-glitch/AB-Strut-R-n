// =============================================================================
// CONTROLLER: cartController.js
// =============================================================================
// Handles everything related to shopping:
//   - Viewing the cart (/cart)
//   - Adding items to cart (POST /cart/add)
//   - Removing items (POST /cart/remove)
//   - Checkout form (/checkout)
//   - Order confirmation (/confirmation/:orderId)
//   - Reorder from history (POST /reorder/:orderId)
//
// SESSION: The cart is stored in req.session.cart — a JavaScript array that
// Express-session keeps alive between page loads (in server memory).
// When the user closes the browser, the session (and cart) is cleared.
// =============================================================================

const productModel = require('../models/productModel');
const orderModel = require('../models/orderModel');

// -----------------------------------------------------------------------------
// showCart(req, res)
// GET /cart — displays all items currently in the session cart.
// -----------------------------------------------------------------------------
function showCart(req, res) {
  // If no cart exists yet in the session, start with an empty array
  const cart = req.session.cart || [];

  // Calculate total price by summing each item's subtotal
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  res.render('cart', {
    title: 'Kundvagn – AB Strut & Rån',
    cart: cart,
    total: total,
    cartCount: cart.length
  });
}

// -----------------------------------------------------------------------------
// addToCart(req, res)
// POST /cart/add — adds a product to the session cart.
//
// req.body contains the form data submitted from the product detail page.
// -----------------------------------------------------------------------------
function addToCart(req, res) {
  // Make sure a cart array exists in the session
  if (!req.session.cart) {
    req.session.cart = [];
  }

  const { productId, quantity, size, angle } = req.body;
  const product = productModel.getProductById(productId);

  if (!product) {
    return res.redirect('/products');
  }

  const qty = parseInt(quantity) || 1;
  const unitPrice = product.price;
  const subtotal = unitPrice * qty;

  // Build a cart item object — includes only what we need to display
  const cartItem = {
    productId: product.id,
    name: product.name,
    category: product.category,
    size: size || null,     // Only set for Strutar
    angle: angle || null,   // Only set for Rån
    quantity: qty,
    unitPrice: unitPrice,
    subtotal: subtotal
  };

  // Check if this exact product+size+angle combination already exists in the cart.
  // If yes, increase quantity instead of adding a duplicate row.
  const existingIndex = req.session.cart.findIndex(item =>
    item.productId == product.id &&
    item.size === cartItem.size &&
    item.angle === cartItem.angle
  );

  if (existingIndex >= 0) {
    // Update existing cart item
    req.session.cart[existingIndex].quantity += qty;
    req.session.cart[existingIndex].subtotal += subtotal;
  } else {
    // Add new cart item
    req.session.cart.push(cartItem);
  }

  res.redirect('/cart');
}

// -----------------------------------------------------------------------------
// removeFromCart(req, res)
// POST /cart/remove — removes one item from the cart by its array index.
// -----------------------------------------------------------------------------
function removeFromCart(req, res) {
  const index = parseInt(req.body.index);

  if (req.session.cart && index >= 0 && index < req.session.cart.length) {
    // .splice(index, 1) removes 1 element at the given position
    req.session.cart.splice(index, 1);
  }

  res.redirect('/cart');
}

// -----------------------------------------------------------------------------
// showCheckout(req, res)
// GET /checkout — renders the checkout form.
// -----------------------------------------------------------------------------
function showCheckout(req, res) {
  const cart = req.session.cart || [];

  // If the cart is empty, redirect to products — nothing to check out
  if (cart.length === 0) {
    return res.redirect('/products');
  }

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  res.render('checkout', {
    title: 'Kassa – AB Strut & Rån',
    cart: cart,
    total: total,
    cartCount: cart.length
  });
}

// -----------------------------------------------------------------------------
// processCheckout(req, res)
// POST /checkout — receives the checkout form, saves the order, clears cart.
//
// async/await explained:
//   - 'async' marks this function as asynchronous (it can pause and resume).
//   - 'await' pauses until a Promise resolves (file write completes).
//   - Without async/await, we'd need to use callbacks or .then() chains,
//     which are harder to read.
// In this project, saveOrder() is actually synchronous (fs.writeFileSync),
// but using async/await is good habit for when you add a real database later.
// -----------------------------------------------------------------------------
async function processCheckout(req, res) {
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.redirect('/products');
  }

  const {
    companyName,
    customerNumber,
    deliveryAddress,
    invoiceAddress,
    sameAddress,  // checkbox: "Samma som leveransadress"
    email,
    phone,
    message
  } = req.body;

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // Generate a unique order ID using the current timestamp.
  // This isn't perfect (two simultaneous orders could clash) but works for learning.
  const orderId = 'ORD-' + Date.now();
  const now = new Date();

  // Calculate estimated delivery: today + 3 business days (simplified as +3 days)
  const delivery = new Date(now);
  delivery.setDate(delivery.getDate() + 3);
  const estimatedDelivery = delivery.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // Build the order object that will be saved to orders.json
  const order = {
    orderId: orderId,
    companyName: companyName,
    customerNumber: customerNumber,
    items: cart,
    totalPrice: total,
    deliveryAddress: deliveryAddress,
    // If checkbox was ticked, invoiceAddress = deliveryAddress
    invoiceAddress: sameAddress ? deliveryAddress : invoiceAddress,
    email: email,
    phone: phone,
    message: message || '',
    status: 'Mottagen',
    createdAt: now.toISOString(),
    estimatedDelivery: estimatedDelivery
  };

  // Save to orders.json via the model
  orderModel.saveOrder(order);

  // Clear the cart after successful order
  req.session.cart = [];

  // Redirect to the confirmation page for this specific order
  res.redirect('/confirmation/' + orderId);
}

// -----------------------------------------------------------------------------
// showConfirmation(req, res)
// GET /confirmation/:orderId — shows the order success page.
// -----------------------------------------------------------------------------
function showConfirmation(req, res) {
  const order = orderModel.getOrderById(req.params.orderId);

  if (!order) {
    return res.redirect('/');
  }

  res.render('confirmation', {
    title: 'Orderbekräftelse – AB Strut & Rån',
    order: order,
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

// -----------------------------------------------------------------------------
// reorder(req, res)
// POST /reorder/:orderId — copies all items from a past order into the cart.
//
// This solves the B2B repeat-order problem from the case:
// Many kiosk owners call in saying "Vi vill ha likadana som förra gången"
// (We want the same as last time). This button does exactly that — it pre-fills
// the cart with the exact same products, sizes, and quantities, so the customer
// just needs to review and confirm. Saves time for both customer and staff.
// -----------------------------------------------------------------------------
function reorder(req, res) {
  // This solves the B2B repeat-order problem from the case
  const order = orderModel.getOrderById(req.params.orderId);

  if (!order) {
    return res.redirect('/orders');
  }

  // Start fresh or add to existing cart? Here we REPLACE the cart contents.
  // The customer can always add/remove from the cart before checking out.
  req.session.cart = order.items.map(item => ({
    productId: item.productId,
    name: item.name,
    category: item.category,
    size: item.size || null,
    angle: item.angle || null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal
  }));

  // Redirect to cart so the customer can review before checking out
  res.redirect('/cart');
}

module.exports = {
  showCart,
  addToCart,
  removeFromCart,
  showCheckout,
  processCheckout,
  showConfirmation,
  reorder
};
