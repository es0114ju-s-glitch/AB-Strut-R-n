// =============================================================================
// MODEL: orderModel.js
// =============================================================================
// Handles all data operations for orders: reading, saving, and updating.
// Like productModel.js, this file only deals with data — not HTTP or HTML.
// =============================================================================

const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// -----------------------------------------------------------------------------
// getAllOrders()
// Returns every order in the system as an array (newest first).
// -----------------------------------------------------------------------------
function getAllOrders() {
  const fileContents = fs.readFileSync(ORDERS_FILE, 'utf8');
  const orders = JSON.parse(fileContents);

  // Sort by createdAt date — newest first — so the latest orders appear at top.
  // localeCompare works for ISO date strings (YYYY-MM-DDTHH:mm:ss).
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// -----------------------------------------------------------------------------
// getOrderById(orderId)
// Finds one order by its ID string (e.g. "ORD-1718123456789").
// -----------------------------------------------------------------------------
function getOrderById(orderId) {
  const orders = getAllOrders();
  return orders.find(order => order.orderId === orderId);
}

// -----------------------------------------------------------------------------
// getOrdersByCustomer(customerNumber)
// Returns all orders for a specific customer, sorted newest first.
// This powers the order history page.
// -----------------------------------------------------------------------------
function getOrdersByCustomer(customerNumber) {
  const orders = getAllOrders();

  // Case-insensitive match so "K1042" and "k1042" both work
  return orders.filter(
    o => o.customerNumber.toLowerCase() === customerNumber.toLowerCase()
  );
}

// -----------------------------------------------------------------------------
// saveOrder(orderData)
// Adds a NEW order to the orders array and writes it back to the JSON file.
//
// WHY WRITE BACK THE WHOLE FILE?
// JSON files don't support "append one line" easily. We read all orders,
// add the new one, then overwrite the entire file. Not efficient for large
// datasets, but fine for a learning project. A real DB would INSERT one row.
// -----------------------------------------------------------------------------
function saveOrder(orderData) {
  // Read all current orders (as raw JSON, then parse)
  const fileContents = fs.readFileSync(ORDERS_FILE, 'utf8');
  const orders = JSON.parse(fileContents);

  // Add the new order to the array
  orders.push(orderData);

  // JSON.stringify converts the JS array back to a JSON string.
  // The 'null, 2' arguments make it pretty-printed with 2-space indentation,
  // so the file stays human-readable in a text editor.
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');

  return orderData; // Return the saved order so the controller can use it
}

// -----------------------------------------------------------------------------
// updateOrderStatus(orderId, newStatus)
// Changes the status of one existing order.
// Used by the admin panel to track delivery progress.
// -----------------------------------------------------------------------------
function updateOrderStatus(orderId, newStatus) {
  const fileContents = fs.readFileSync(ORDERS_FILE, 'utf8');
  const orders = JSON.parse(fileContents);

  // Find the order by ID and update just the status field
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return false; // Order not found

  order.status = newStatus;

  // Write the entire updated array back to disk
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  return true;
}

module.exports = {
  getAllOrders,
  getOrderById,
  getOrdersByCustomer,
  saveOrder,
  updateOrderStatus
};
