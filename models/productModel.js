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

// -----------------------------------------------------------------------------
// getAllProducts()
// Returns ALL products from the JSON file as a JavaScript array.
// No filtering, no sorting — that happens in the controller.
// -----------------------------------------------------------------------------
function getAllProducts() {
  // fs.readFileSync reads the file and blocks until done (synchronous).
  // 'utf8' tells Node to treat the file as text (not binary).
  const fileContents = fs.readFileSync(PRODUCTS_FILE, 'utf8');

  // JSON.parse converts the JSON string into a real JavaScript array of objects.
  return JSON.parse(fileContents);
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

// Export these functions so other files (controllers) can use them.
// This is how Node.js modules share functionality.
module.exports = {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts
};
