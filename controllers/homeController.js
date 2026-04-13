// =============================================================================
// CONTROLLER: homeController.js
// =============================================================================
// WHAT IS A CONTROLLER?
// In MVC, the Controller is the MIDDLEMAN. It:
//   1. Receives the HTTP request from Express (via routes.js)
//   2. Asks the Model for the data it needs
//   3. Passes that data to the View (EJS template) to be rendered as HTML
//   4. Sends the HTML response back to the browser
//
// The controller contains the LOGIC (what to do), not the data (model)
// and not the presentation (view). This separation keeps code organised.
// =============================================================================

// Import our product model so we can fetch data
const productModel = require('../models/productModel');

// -----------------------------------------------------------------------------
// showHome(req, res)
// Handles GET / — renders the home page.
//
// 'req' = the incoming request object (contains headers, session, body, etc.)
// 'res' = the response object (we use this to send back HTML or redirect)
// -----------------------------------------------------------------------------
function showHome(req, res) {
  // Ask the model for featured products to show on the home page
  const featured = productModel.getFeaturedProducts();

  // res.render() tells Express/EJS to:
  //   1. Find the file views/home.ejs
  //   2. Inject the data object { featured } into the template
  //   3. Return the resulting HTML to the browser
  res.render('home', {
    title: 'AB Strut & Rån – Glassleverantör för proffs',
    featured: featured,
    // Pass the cart item count for the navbar badge
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

module.exports = { showHome };
