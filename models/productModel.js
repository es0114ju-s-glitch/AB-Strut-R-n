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

// In-memory cache and simple search index to avoid reading/parsing file on
// every request. The dataset is small, but this makes searches fast.
let _productsCache = null;

function _loadProducts() {
  if (_productsCache) return _productsCache;
  const contents = fs.readFileSync(PRODUCTS_FILE, 'utf8');
  const arr = JSON.parse(contents);

  // Precompute normalized fields for faster search
  _productsCache = arr.map(p => {
    const normName = (p.name || '').toString().toLowerCase();
    const normDesc = (p.description || '').toString().toLowerCase();
    const idStr = (p.id || '').toString();
    const article = (p.articleNumber || '').toString().toLowerCase();
    const combined = `${normName} ${normDesc} ${idStr} ${article}`;
    const normalize = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return Object.assign({}, p, {
      _searchText: normalize(combined),
      _normName: normalize(normName),
      _idStr: idStr,
      _article: normalize(article)
    });
  });

  return _productsCache;
}

// Clear cache (useful during development)
function clearCache() {
  _productsCache = null;
}

// -----------------------------------------------------------------------------
// search(query, options)
// Fast, scored search over product name and id. Returns up to options.limit
// results. Scoring is heuristic: exact id match > name startsWith > name contains
// > token matches. Diacritics are ignored and search is case-insensitive.
// -----------------------------------------------------------------------------
function search(query, options = {}) {
  if (!query || !query.toString().trim()) return [];
  const limit = options.limit || 30;
  const q = query.toString().toLowerCase();

  // normalize diacritics
  const qNorm = q.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const tokens = qNorm.split(/\s+/).filter(Boolean);

  const products = _loadProducts();

  const results = [];

  for (const p of products) {
    let score = 0;


    // exact id (numeric) match
    if (p._idStr === qNorm) {
      score += 1000;
    }

    // exact article number match (ART-0001 or sku)
    if (p._article && p._article === qNorm) {
      score += 900;
    }

    // article startsWith
    if (p._article && p._article.startsWith(qNorm)) score += 400;

  // name starts with query
  if (p._normName.startsWith(qNorm)) score += 200;

    // name contains query
    if (p._normName.includes(qNorm)) score += 100;

    // description or other text contains query
    if (p._searchText && p._searchText.includes(qNorm)) score += 30;

    // token matching - reward products that match more tokens
    let tokenMatches = 0;
    for (const t of tokens) {
      if (p._searchText.includes(t)) tokenMatches++;
    }
    score += tokenMatches * 25;

    // small boost for in-stock items
    const inStock = (p.stock && p.stock > 0) || (p.stockPerSize && Object.values(p.stockPerSize).some(n => n > 0));
    if (inStock) score += 5;

    if (score > 0) results.push({ product: p, score });
  }

  // sort by score desc then by name
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.name.localeCompare(b.product.name);
  });

  return results.slice(0, limit).map(r => r.product);
}

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

    return {
      ...product,
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

function updateProductPrice(productId, newPrice) {
  const products = readProductsRaw();
  const product = products.find(p => p.id == productId);

  if (!product) {
    return false;
  }

  product.price = newPrice;
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
  ,search
  ,clearCache
};
