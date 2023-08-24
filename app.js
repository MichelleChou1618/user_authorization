// 載入 express 並建構應用程式伺服器
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')

// 載入 User model
const User = require('./models/user')

// 引用 body-parser
const bodyParser = require('body-parser')



// 加入這段 code, 僅在非正式環境時, 使用 dotenv
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
// 載入 mongoose
const mongoose = require('mongoose')
// 設定連線到 mongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })

// 取得資料庫連線狀態
const db = mongoose.connection
// 連線異常
db.on('error', () => {
  console.log('mongodb error!')
})
// 連線成功
db.once('open', () => {
  console.log('mongodb connected!')
})

app.engine('hbs', exphbs({ defaultLayout: 'main', extname: '.hbs' }))
app.set('view engine', 'hbs')

// 用 app.use 規定每一筆請求都需要透過 body-parser 進行前置處理
app.use(bodyParser.urlencoded({ extended: true }))





// 設定首頁路由
app.get('/', (req, res) => {
  res.render('login')
})


// 設定login路由
app.post('/login', (req, res) => {
  //console.log("req.body: ", req.body)
  //取得表單資訊
  const { email, pwd } = req.body
  console.log(`post: { email:${email}, pwd:${pwd}}`)

  //取得符合輸入email的資料庫user資訊
  User.findOne({ email: email })
    .lean()
    .then(data => {
    
      //如果找不到 username，或是 password 錯誤，就彈回登入頁並且在介面上顯示「Username 或Password 錯誤」
      if ((!data) || (data.password !== pwd)) {
        console.log('no matched data found.')
        let error = 'Username 或Password 錯誤'
        res.render('login', { error: error })

      }
      //如果 username + password 組合正確，使用者就進入自己的 welcome page，在此頁面上會顯示登入使用者的 firstName
      else {
        console.log(`matched user: {email:${data.email}, pwd:${data.password}}`)
        res.render('welcome', { name: data.firstName })
      }

    })
    .catch(error => console.error(error))
})

// 設定 port 3000
app.listen(3000, () => {
  console.log('App is running on http://localhost:3000')
})