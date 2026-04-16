function showLogin(req, res) {
  res.render('login', {
    title: 'Logga in – AB Strut & Rån',
    errorMessage: null,
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

function login(req, res) {
  const customerNumber = (req.body.customerNumber || '').trim();

  if (!customerNumber) {
    return res.status(400).render('login', {
      title: 'Logga in – AB Strut & Rån',
      errorMessage: 'Ange ett kundnummer för att logga in.',
      cartCount: req.session.cart ? req.session.cart.length : 0
    });
  }

  // Session-based login using only kundnummer — simple for Version 1. Version 2 should add password + bcrypt.
  req.session.customerNumber = customerNumber;
  res.redirect('/orders');
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/');
  });
}

module.exports = {
  showLogin,
  login,
  logout
};
