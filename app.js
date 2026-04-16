// =============================================================================
// APP.JS — The Entry Point
// =============================================================================
// This is the FIRST file Node.js runs when you type: node app.js
//
// It does 4 things:
//   1. Creates an Express application
//   2. Configures middleware (tools that run on every request)
//   3. Connects the routes
//   4. Starts the web server on port 3000
//
// WHAT IS EXPRESS?
// Express is a framework built on top of Node.js that makes it much easier
// to build web servers. Without Express, you'd write hundreds of lines of
// raw Node.js code to handle URLs, parse form data, etc.
// =============================================================================

const express = require('express');       // The Express framework
const session = require('express-session'); // Adds session support (for the cart)
const path = require('path');              // Node.js built-in path utility

// Create the Express application
const app = express();

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================
// Middleware = functions that run on EVERY incoming request BEFORE it reaches
// the route handler. Think of them as security guards or assistants that
// pre-process each request.

// 1. Set EJS as the templating engine (View engine)
//    This tells Express to look for .ejs files in the /views folder
//    when we call res.render('home') — it automatically adds the .ejs extension
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Serve static files (CSS, images, client-side JS)
//    Any file in /public is accessible directly from the browser.
//    Example: /public/css/custom.css → http://localhost:3000/css/custom.css
app.use(express.static(path.join(__dirname, 'public')));

// 3. Parse incoming form data (from HTML <form> POST requests)
//    Without this, req.body would be undefined when a form is submitted.
//    urlencoded: handles standard HTML form encoding (key=value&key2=value2)
//    extended: true allows nested objects in form data
app.use(express.urlencoded({ extended: true }));

// 4. Parse JSON request bodies (useful if you add an API later)
app.use(express.json());

// 5. Session middleware — stores cart data between page requests.
//    Without sessions, every page load would be a fresh start (cart disappears).
//
//    HOW SESSIONS WORK:
//    - When a user first visits, Express creates a unique session ID.
//    - That ID is stored in a cookie in the user's browser.
//    - On every subsequent request, the browser sends the cookie back.
//    - Express uses the ID to find the user's data in memory (req.session).
//    - req.session.cart = [...] saves data; it persists until the server restarts.
app.use(session({
  secret: 'ab-strut-ran-hemlig-nyckel', // Used to sign the session cookie. Change this in production!
  resave: false,           // Don't save the session if nothing changed (more efficient)
  saveUninitialized: false // Don't create a session until something is stored in it
}));

app.use((req, res, next) => {
  res.locals.customerNumber = req.session.customerNumber || null;
  res.locals.cartCount = req.session.cart ? req.session.cart.length : 0;
  next();
});

// =============================================================================
// ROUTES
// =============================================================================
// Connect all routes defined in routes.js.
// Any request that comes in will be matched against those routes.
const routes = require('./routes');
app.use('/', routes);

// =============================================================================
// 404 HANDLER
// =============================================================================
// If no route matched the request, Express falls through to this middleware.
// It renders the 404 page instead of showing a generic error.
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Sidan hittades inte – AB Strut & Rån',
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
});

// =============================================================================
// START THE SERVER
// =============================================================================
const PORT = 3000;

// app.listen() starts the server and makes it listen for incoming connections.
// The callback function runs once when the server is ready.
app.listen(PORT, () => {
  console.log('=================================================');
  console.log('  AB Strut & Rån – Webbserver startad!');
  console.log(`  Öppna: http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log('=================================================');
});
