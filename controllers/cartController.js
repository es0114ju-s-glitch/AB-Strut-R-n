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
const templateModel = require('../models/templateModel');

// -----------------------------------------------------------------------------
// showCart(req, res)
// GET /cart — displays all items currently in the session cart.
// -----------------------------------------------------------------------------
function showCart(req, res) {
  // If no cart exists yet in the session, start with an empty array
  const cart = req.session.cart || [];

  // Calculate total price by summing each item's subtotal
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // Also load saved templates? The cart page shows a quick apply UI but the
  // full management page is under /templates. We pass templates only if the
  // user provided a customerNumber in query (conservative approach).
  const customerNumber = req.query.customer || (req.session.customerNumber || '');
  const templates = customerNumber ? templateModel.getTemplatesByOwner(customerNumber) : [];

  res.render('cart', {
    title: 'Kundvagn – AB Strut & Rån',
    cart: cart,
    total: total,
    cartCount: cart.length,
    templates: templates,
    defaultCustomerNumber: customerNumber
  });
}

// -----------------------------------------------------------------------------
// saveTemplate(req, res)
// POST /templates/save — saves the current session cart as a named template
// -----------------------------------------------------------------------------
function saveTemplate(req, res) {
  const cart = req.session.cart || [];

  // Don't allow saving empty carts
  if (cart.length === 0) {
    req.session.flash = { type: 'warning', message: 'Kundvagnen är tom — inget sparades.' };
    return res.redirect('/cart');
  }

  const { name, customerNumber } = req.body;
  const owner = customerNumber && customerNumber.trim() ? customerNumber.trim() : null;
  const title = (name && name.trim()) ? name.trim() : 'Sparad inköpslista';

  const template = {
    id: 'TPL-' + Date.now(),
    name: title,
    owner: owner, // owner/customerNumber for user-specific templates
    items: cart.map(item => ({
      productId: item.productId,
      name: item.name,
      category: item.category,
      size: item.size || null,
      angle: item.angle || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal
    })),
    createdAt: new Date().toISOString()
  };

  templateModel.saveTemplate(template);

  // Remember the customerNumber in session to simplify later operations
  if (owner) req.session.customerNumber = owner;

  req.session.flash = { type: 'success', message: 'Inköpslista sparad.' };
  res.redirect('/cart');
}

// -----------------------------------------------------------------------------
// applyTemplate(req, res)
// POST /templates/apply/:id — copies a saved template into the session cart
// -----------------------------------------------------------------------------
function applyTemplate(req, res) {
  const tplId = req.params.id;
  const mode = req.body.mode || 'replace'; // 'replace' or 'merge'
  const customerNumber = req.body.customerNumber || req.session.customerNumber || null;

  const template = templateModel.getTemplateById(tplId);
  if (!template) {
    req.session.flash = { type: 'warning', message: 'Inköpslista hittades inte.' };
    return res.redirect('/cart');
  }

  // If template has an owner, require the same customerNumber to operate
  if (template.owner && customerNumber && template.owner.toLowerCase() !== customerNumber.toLowerCase()) {
    req.session.flash = { type: 'danger', message: 'Du har inte behörighet att använda den här inköpslistan.' };
    return res.redirect('/cart');
  }

  // Validate items against current products — collect warnings
  const warnings = [];
  const newItems = [];

  for (const item of template.items) {
    const prod = productModel.getProductById(item.productId);
    if (!prod) {
      warnings.push(`Produkten "${item.name}" (id ${item.productId}) finns inte längre och hoppades över.`);
      continue; // skip missing product
    }

    // If price changed, update unitPrice and mention it
    let unitPrice = item.unitPrice || prod.price || 0;
    if (prod.price && prod.price !== unitPrice) {
      warnings.push(`Pris uppdaterades för "${item.name}": ${unitPrice} → ${prod.price} kr.`);
      unitPrice = prod.price;
    }

    const qty = parseInt(item.quantity) || 1;
    const subtotal = unitPrice * qty;

    newItems.push({
      productId: prod.id,
      name: prod.name,
      category: prod.category,
      size: item.size || null,
      angle: item.angle || null,
      quantity: qty,
      unitPrice: unitPrice,
      subtotal: subtotal
    });
  }

  if (mode === 'merge' && Array.isArray(req.session.cart) && req.session.cart.length > 0) {
    // Merge: append newItems to existing cart (coalesce identical items)
    const merged = req.session.cart.slice();
    for (const ni of newItems) {
      const idx = merged.findIndex(m => m.productId == ni.productId && m.size === ni.size && m.angle === ni.angle);
      if (idx >= 0) {
        merged[idx].quantity += ni.quantity;
        merged[idx].subtotal += ni.subtotal;
      } else {
        merged.push(ni);
      }
    }
    req.session.cart = merged;
  } else {
    // Replace default
    req.session.cart = newItems;
  }

  // attach flash messages if any warnings
  if (warnings.length) {
    req.session.flash = { type: 'warning', message: warnings.join(' ') };
  } else {
    req.session.flash = { type: 'success', message: 'Inköpslista applicerad på kundvagnen.' };
  }

  // remember customerNumber
  if (customerNumber) req.session.customerNumber = customerNumber;

  res.redirect('/cart');
}

// -----------------------------------------------------------------------------
// deleteTemplate(req, res)
// POST /templates/delete/:id — removes a saved template
// -----------------------------------------------------------------------------
function deleteTemplate(req, res) {
  const tplId = req.params.id;
  const customerNumber = req.body.customerNumber || req.session.customerNumber || null;

  const tpl = templateModel.getTemplateById(tplId);
  if (!tpl) {
    req.session.flash = { type: 'warning', message: 'Inköpslista hittades inte.' };
    return res.redirect('/templates');
  }

  if (tpl.owner && customerNumber && tpl.owner.toLowerCase() !== customerNumber.toLowerCase()) {
    req.session.flash = { type: 'danger', message: 'Du har inte behörighet att ta bort den här inköpslistan.' };
    return res.redirect('/templates');
  }

  templateModel.deleteTemplate(tplId);
  req.session.flash = { type: 'success', message: 'Inköpslista borttagen.' };
  res.redirect('/templates');
}

// -----------------------------------------------------------------------------
// showEditTemplate(req, res)
// GET /templates/edit/:id — render a form to edit quantities, sizes, angles
// -----------------------------------------------------------------------------
function showEditTemplate(req, res) {
  const tplId = req.params.id;
  const customerNumber = req.query.customer || req.session.customerNumber || '';

  const tpl = templateModel.getTemplateById(tplId);
  if (!tpl) {
    req.session.flash = { type: 'warning', message: 'Inköpslista hittades inte.' };
    return res.redirect('/templates');
  }

  if (tpl.owner && customerNumber && tpl.owner.toLowerCase() !== customerNumber.toLowerCase()) {
    req.session.flash = { type: 'danger', message: 'Du har inte behörighet att redigera den här inköpslistan.' };
    return res.redirect('/templates');
  }

  // Load full product list so user can add items by selecting known products
  const allProducts = productModel.getAllProducts();

  res.render('templates-edit', {
    title: 'Redigera inköpslista – AB Strut & Rån',
    template: tpl,
    products: allProducts,
    customerNumber: customerNumber,
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

// -----------------------------------------------------------------------------
// editTemplate(req, res)
// POST /templates/edit/:id — save edits to a template (items + name)
// -----------------------------------------------------------------------------
function editTemplate(req, res) {
  const tplId = req.params.id;
  const { name, customerNumber } = req.body;

  const tpl = templateModel.getTemplateById(tplId);
  if (!tpl) {
    req.session.flash = { type: 'warning', message: 'Inköpslista hittades inte.' };
    return res.redirect('/templates');
  }

  if (tpl.owner && customerNumber && tpl.owner.toLowerCase() !== customerNumber.toLowerCase()) {
    req.session.flash = { type: 'danger', message: 'Du har inte behörighet att ändra den här inköpslistan.' };
    return res.redirect('/templates');
  }

  // Parse incoming arrays for items. Form uses item_productId[], item_quantity[], item_size[], item_angle[]
  const ids = Array.isArray(req.body['item_productId']) ? req.body['item_productId'] : (req.body['item_productId'] ? [req.body['item_productId']] : []);
  const quantities = Array.isArray(req.body['item_quantity']) ? req.body['item_quantity'] : (req.body['item_quantity'] ? [req.body['item_quantity']] : []);
  const sizes = Array.isArray(req.body['item_size']) ? req.body['item_size'] : (req.body['item_size'] ? [req.body['item_size']] : []);
  const angles = Array.isArray(req.body['item_angle']) ? req.body['item_angle'] : (req.body['item_angle'] ? [req.body['item_angle']] : []);

  const newItems = [];
  for (let i = 0; i < ids.length; i++) {
    const pid = ids[i];
    const qty = parseInt(quantities[i]) || 0;
    const size = sizes[i] || null;
    const angle = angles[i] || null;
    if (qty <= 0) continue; // skip rows with zero quantity (treated as delete)

    // Look up product to capture current name/price/category
    const prod = productModel.getProductById(pid);
    const unitPrice = prod ? prod.price : 0;
    const nameForItem = prod ? prod.name : `Produkt ${pid}`;

    newItems.push({
      productId: pid,
      name: nameForItem,
      category: prod ? prod.category : 'Okänd',
      size: size || null,
      angle: angle || null,
      quantity: qty,
      unitPrice: unitPrice,
      subtotal: unitPrice * qty
    });
  }

  // Optionally add a new item via add_productId fields
  if (req.body.add_productId) {
    const addPid = req.body.add_productId;
    const addQty = parseInt(req.body.add_quantity) || 0;
    const addSize = req.body.add_size || null;
    const addAngle = req.body.add_angle || null;
    if (addPid && addQty > 0) {
      const prod = productModel.getProductById(addPid);
      const unitPrice = prod ? prod.price : 0;
      const nameForItem = prod ? prod.name : `Produkt ${addPid}`;
      newItems.push({
        productId: addPid,
        name: nameForItem,
        category: prod ? prod.category : 'Okänd',
        size: addSize,
        angle: addAngle,
        quantity: addQty,
        unitPrice: unitPrice,
        subtotal: unitPrice * addQty
      });
    }
  }

  // Update template (name and items)
  const updates = { name: (name && name.trim()) ? name.trim() : tpl.name, items: newItems };
  if (customerNumber && customerNumber.trim()) updates.owner = customerNumber.trim();

  templateModel.updateTemplate(tplId, updates);
  if (customerNumber && customerNumber.trim()) req.session.customerNumber = customerNumber.trim();

  req.session.flash = { type: 'success', message: 'Inköpslistan uppdaterades.' };
  res.redirect('/templates');
}

// -----------------------------------------------------------------------------
// showTemplates(req, res)
// GET /templates — management page for user-specific templates
// -----------------------------------------------------------------------------
function showTemplates(req, res) {
  const customerNumber = req.query.customer || req.session.customerNumber || '';
  const templates = customerNumber ? templateModel.getTemplatesByOwner(customerNumber) : [];

  res.render('templates', {
    title: 'Mina inköpslistor – AB Strut & Rån',
    templates: templates,
    customerNumber: customerNumber,
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

// -----------------------------------------------------------------------------
// updateTemplate(req, res)
// POST /templates/update/:id — update template name
// -----------------------------------------------------------------------------
function updateTemplate(req, res) {
  const tplId = req.params.id;
  const { name, customerNumber } = req.body;
  const customer = customerNumber || req.session.customerNumber || null;

  const tpl = templateModel.getTemplateById(tplId);
  if (!tpl) {
    req.session.flash = { type: 'warning', message: 'Inköpslista hittades inte.' };
    return res.redirect('/templates');
  }

  if (tpl.owner && customer && tpl.owner.toLowerCase() !== customer.toLowerCase()) {
    req.session.flash = { type: 'danger', message: 'Du har inte behörighet att ändra den här inköpslistan.' };
    return res.redirect('/templates');
  }

  const newName = (name && name.trim()) ? name.trim() : tpl.name;
  templateModel.updateTemplateName(tplId, newName);
  req.session.flash = { type: 'success', message: 'Inköpslistans namn uppdaterades.' };
  if (customer) req.session.customerNumber = customer;
  res.redirect('/templates');
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
  reorder,
  saveTemplate,
  applyTemplate,
  deleteTemplate
  ,showTemplates,
  updateTemplate,
  showEditTemplate,
  editTemplate
};
