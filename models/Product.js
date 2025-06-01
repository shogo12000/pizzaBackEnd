const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  size: String,
  price: String,
});

const productSchema = new mongoose.Schema({
  id: Number,
  title: String,
  description: String,
  price: [priceSchema],
  crust: [String],
  category: String,
  special: Boolean,
  image: String,
});

module.exports = mongoose.model('Product', productSchema);