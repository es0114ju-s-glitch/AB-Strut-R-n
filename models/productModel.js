// =============================================================================
// MODEL: productModel.js
// =============================================================================
// WHAT IS A MODEL?
// In MVC, the Model is responsible for DATA. It doesn't know about the web,
// HTTP requests, or what the user sees. It only knows how to find, read,
// and return data. This keeps data logic separate from everything else.
//
// WHY SEPARATE THE MODEL?
// If you later switch from JSON files to a real database (PostgreSQL, MongoDB),
// you only need to change this file — not the controllers or views.
// =============================================================================

const fs = require('fs');   // Node.js built-in: file system operations
const path = require('path'); // Node.js built-in: handles file paths safely

// Build a reliable path to the products.json file.
// __dirname = the folder where THIS file lives (/models)
// We go up one level (..) then into /data/products.json
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function readProductsRaw() {
  const fileContents = fs.readFileSync(PRODUCTS_FILE, 'utf8');
  return JSON.parse(fileContents);
}

function writeProductsRaw(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
}

function normalizeProduct(product) {
  if (product.category === 'Strutar' && product.stockPerSize) {
    const totalStock = Object.values(product.stockPerSize).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );

    // Each size has its own price because larger cones use more material — pricePerSize replaces the flat price
    const sizePrices = product.pricePerSize ? Object.values(product.pricePerSize) : [];
    const fallbackPrice = Number(product.price || 0);
    const minSizePrice = sizePrices.length > 0
      ? Math.min(...sizePrices.map(value => Number(value || 0)))
      : fallbackPrice;

    return {
      ...product,
      price: minSizePrice,
      stock: totalStock
    };
  }

  return product;
}

// -----------------------------------------------------------------------------
// getAllProducts()
// Returns ALL products from the JSON file as a JavaScript array.
// No filtering, no sorting — that happens in the controller.
// -----------------------------------------------------------------------------
function getAllProducts() {
  return readProductsRaw().map(normalizeProduct);
}

// -----------------------------------------------------------------------------
// getProductById(id)
// Finds and returns a single product by its numeric ID.
// Returns undefined if not found.
// -----------------------------------------------------------------------------
function getProductById(id) {
  const products = getAllProducts();

  // .find() loops through the array and returns the first item where the
  // condition is true. We use == (not ===) to handle both string and number IDs,
  // since URL params come in as strings but JSON has numbers.
  return products.find(product => product.id == id);
}

// -----------------------------------------------------------------------------
// getProductsByCategory(category)
// Filters products by category name (e.g. "Strutar", "Bägare").
// -----------------------------------------------------------------------------
function getProductsByCategory(category) {
  const products = getAllProducts();

  // .filter() returns a NEW array with only products matching the category.
  // toLowerCase() makes the comparison case-insensitive for safety.
  return products.filter(
    p => p.category.toLowerCase() === category.toLowerCase()
  );
}

// -----------------------------------------------------------------------------
// getFeaturedProducts()
// Returns a small selection of products for the home page hero section.
// "Featured" here = in stock and one from each category.
// -----------------------------------------------------------------------------
function getFeaturedProducts() {
  const products = getAllProducts();

  // Get one product per category that is in stock (stock > 0)
  const categories = ['Strutar', 'Rån', 'Bägare', 'Glassmaskiner'];
  const featured = [];

  for (const cat of categories) {
    const match = products.find(p => p.category === cat && p.stock > 0);
    if (match) featured.push(match);
  }

  return featured;
}

function reduceStockForOrderItems(items) {
  const products = readProductsRaw();

  items.forEach(item => {
    const product = products.find(p => p.id == item.productId);
    if (!product) return;

    const qty = Number(item.quantity || 0);
    if (qty <= 0) return;

    if (product.category === 'Strutar' && product.stockPerSize && item.size) {
      const currentSizeStock = Number(product.stockPerSize[item.size] || 0);
      product.stockPerSize[item.size] = Math.max(0, currentSizeStock - qty);
      return;
    }

    const currentStock = Number(product.stock || 0);
    product.stock = Math.max(0, currentStock - qty);
  });

  writeProductsRaw(products);
}

function updateProductPrice(productId, pricingData) {
  const products = readProductsRaw();
  const product = products.find(p => p.id == productId);

  if (!product) {
    return false;
  }

  if (product.category === 'Strutar') {
    product.pricePerSize = { ...pricingData.pricePerSize };
  } else {
    product.price = Number(pricingData.price);
  }

  writeProductsRaw(products);
  return true;
}

// Export these functions so other files (controllers) can use them.
// This is how Node.js modules share functionality.
module.exports = {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  reduceStockForOrderItems,
  updateProductPrice
};
