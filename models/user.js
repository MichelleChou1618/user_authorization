const mongoose = require('mongoose')
const Schema = mongoose.Schema
const userSchema = new Schema({
  firstName: {
    type: String, // 資料型別是字串
    required: true // 這是個必填欄位
  },
  email: {
    type: String, // 資料型別是字串
    required: true // 這是個必填欄位
  },
  password: {
    type: String, // 資料型別是字串
    required: true // 這是個必填欄位
  },

})
module.exports = mongoose.model('User', userSchema)