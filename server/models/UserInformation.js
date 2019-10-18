var mongoose = require('mongoose');
var user_info = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  buyOrders: [
    {
      orderID: {
        type: String,
        trim: true
      }
    }
  ],
  sellOrders: [
    {
      orderID: {
        type: String,
        trim: true
      }
    }
  ]
});
var UserInformation = mongoose.model('UserInformation', user_info);
module.exports = UserInformation;
