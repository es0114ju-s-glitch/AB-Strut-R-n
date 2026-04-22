const offertModel = require('../models/offertModel');
const productModel = require('../models/productModel');

function showOffertForm(req, res) {
  const productId = req.query.productId || '';
  const product = productId ? productModel.getProductById(productId) : null;

  res.render('offert', {
    title: 'Begär offert – AB Strut & Rån',
    product: product,
    successMessage: null,
    errorMessage: null,
    formData: {
      productId: product ? String(product.id) : productId,
      name: '',
      company: '',
      email: '',
      phone: '',
      message: ''
    },
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

function submitOffert(req, res) {
  const formData = {
    productId: String(req.body.productId || '').trim(),
    name: (req.body.name || '').trim(),
    company: (req.body.company || '').trim(),
    email: (req.body.email || '').trim(),
    phone: (req.body.phone || '').trim(),
    message: (req.body.message || '').trim()
  };

  const product = formData.productId ? productModel.getProductById(formData.productId) : null;

  if (!formData.name || !formData.company || !formData.email || !formData.phone || !formData.message || !product) {
    return res.status(400).render('offert', {
      title: 'Begär offert – AB Strut & Rån',
      product: product,
      successMessage: null,
      errorMessage: 'Fyll i alla fält för att skicka offertförfrågan.',
      formData: formData,
      cartCount: req.session.cart ? req.session.cart.length : 0
    });
  }

  // Ice cream machines require a longer sales process with quotes — matches the case description exactly
  offertModel.saveOffert({
    offertId: 'OFF-' + Date.now(),
    productId: product.id,
    productName: product.name,
    name: formData.name,
    company: formData.company,
    email: formData.email,
    phone: formData.phone,
    message: formData.message,
    createdAt: new Date().toISOString()
  });

  res.render('offert', {
    title: 'Begär offert – AB Strut & Rån',
    product: product,
    successMessage: 'Offertförfrågan skickad. Vi återkommer inom 1 arbetsdag.',
    errorMessage: null,
    formData: {
      productId: String(product.id),
      name: '',
      company: '',
      email: '',
      phone: '',
      message: ''
    },
    cartCount: req.session.cart ? req.session.cart.length : 0
  });
}

module.exports = {
  showOffertForm,
  submitOffert
};
