// 載入 express 並建構應用程式伺服器
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')

// 載入 User model
const User = require('./models/user')

// 引用 body-parser
const bodyParser = require('body-parser')

// 引用 cookie-parser
const cookieParser = require('cookie-parser')

//引用uuid
const uuid = require('uuid')

// each session contains the username of the user and the time at which it expires
class Session {
  constructor(username, expiresAt) {
    this.username = username
    this.expiresAt = expiresAt
  }

  // we'll use this method later to determine if the session has expired
  isExpired() {
    this.expiresAt < (new Date())
  }
}

// this object stores the users sessions. For larger scale applications, you can use a database or cache for this purpose
const sessions = {}

// refactor: 引用路由器: 引入路由器時，路徑設定為 /routes 就會自動去尋找目錄下叫做 index 的檔案
const routes = require('./routes')


//refactor: 將mongoose連線設定抽離app.js,再從app.js引用設定檔:對 app.js 而言，Mongoose 連線設定只需要「被執行」，不需要接到任何回傳參數繼續利用，所以這裡不需要再設定變數
require('./config/mongoose')


/*
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
*/

//setting handlebars
app.engine('hbs', exphbs({ defaultLayout: 'main', extname: '.hbs' }))
app.set('view engine', 'hbs')

// setting static files
app.use(express.static('public'))

// 用 app.use 規定每一筆請求都需要透過 body-parser 進行前置處理
app.use(bodyParser.urlencoded({ extended: true }))

//使用cookie-parser取得req.coockies的資訊
app.use(cookieParser())

// refactor: 將 request 導入路由器
app.use(routes)


/*
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
      //加入session cookie authentication機制: 有登入過的user, 下次進入網頁時, 不需要再輸入mail/pwd, 即可透過browser儲存的cookie 識別碼, 由server端驗證完後, 自動登入
      else {
        console.log(`matched user: {email:${data.email}, pwd:${data.password}}`)

        //Creating Session Tokens:
        // generate a random UUID as the session token
        const sessionToken = uuid.v4()

        // set the expiry time as 120s after the current time
        const now = new Date()
        const expiresAt = new Date(+now + 120 * 1000)

        const username = data.firstName

        // create a session containing information about the user and expiry time
        const session = new Session(username, expiresAt)
        // add the session information to the sessions map
        sessions[sessionToken] = session
        console.log(`New session info: ${sessionToken}: {${session.username}, ${session.expiresAt}}`)

        // In the response, set a cookie on the client with the name "session_cookie"
        // and the value as the UUID we generated. We also set the expiry time
        res.cookie("session_token", sessionToken, { expires: expiresAt })

        res.render('welcome', { name: data.firstName })
      }

    })
    .catch(error => console.error(error))
})

// 設定welcome路由
app.get('/welcome', (req, res) => {
  
  console.log(req.cookies)
  //Authenticating Users Through Session Cookies:
  // if this request doesn't have any cookies, that means it isn't authenticated. 
  if (!req.cookies) {
    console.log(" no session_token cookie along with the request (which means that the requestor hasn’t logged in)")
    let errormessage = "Login first."
    res.render('welcome', {errormessage:errormessage})
    return
  }

  // We can obtain the session token from the requests cookies, which come with every request
  const sessionToken = req.cookies['session_token']
  if (!sessionToken) {
    // If the cookie is not set, meaning that the requestor is sending us an invalid session token
    console.log("the session token is not present in memory (which means that the requestor is sending us an invalid session token)")
    let errormessage = "Invalid Authentication.Try re-login."
    res.render('welcome', { errormessage: errormessage })
    return
  }

  // We then get the session of the user from our session map
  userSession = sessions[sessionToken]
  if (!userSession) {
    // If the session token is not present in session map, meaning that the requestor is sending us an invalid session token
    console.log("the session token is not present in memory (which means that the requestor is sending us an invalid session token)")
    let errormessage = "Invalid Authentication. Try re-login."
    res.render('welcome', { errormessage: errormessage })
    return
  }
  // if the session has expired, delete the session from our map
  if (userSession.isExpired()) {
    
    console.log("the session has expired")
    delete sessions[sessionToken]
    let errormessage = "Authentication Expired.Re-login again."
    res.render('welcome', { errormessage: errormessage })
    return
  }

  // If all checks have passed, we can consider the user authenticated and send a welcome message
  res.render('welcome', { name: userSession.username })

})

// 設定refresh路由
app.post('/refresh', (req, res) => {

  console.log(req.cookies)
  //Refreshing Session Tokens:
  // if this request doesn't have any cookies, that means it isn't authenticated. 
  if (!req.cookies) {
    console.log(" no session_token cookie along with the request (which means that the requestor hasn’t logged in)")
    let errormessage = "Login first."
    res.render('welcome', { errormessage: errormessage })
    return
  }

  // We can obtain the session token from the requests cookies, which come with every request
  const sessionToken = req.cookies['session_token']
  if (!sessionToken) {
    // If the cookie is not set, meaning that the requestor is sending us an invalid session token
    console.log("the session token is not present in memory (which means that the requestor is sending us an invalid session token)")
    let errormessage = "Invalid Authentication.Try re-login."
    res.render('welcome', { errormessage: errormessage })
    return
  }

  // We then get the session of the user from our session map
  userSession = sessions[sessionToken]
  if (!userSession) {
    // If the session token is not present in session map, meaning that the requestor is sending us an invalid session token
    console.log("the session token is not present in memory (which means that the requestor is sending us an invalid session token)")
    let errormessage = "Invalid Authentication. Try re-login."
    res.render('welcome', { errormessage: errormessage })
    return
  }
  // if the session has expired, delete the session from our map
  if (userSession.isExpired()) {

    console.log("the session has expired")
    delete sessions[sessionToken]
    let errormessage = "Authentication Expired.Re-login again."
    res.render('welcome', { errormessage: errormessage })
    return
  }

  // create a new session token
  const newSessionToken = uuid.v4()

  // renew the expiry time
  const now = new Date()
  const expiresAt = new Date(+now + 120 * 1000)
  const session = new Session(userSession.username, expiresAt)

  // add the new session to our map, and delete the old session
  sessions[newSessionToken] = session
  delete sessions[sessionToken]

  // set the session token to the new value we generated, with a
  // renewed expiration time
  res.cookie("session_token", newSessionToken, { expires: expiresAt })
  

  // If all checks have passed, we can consider the user authenticated and send a welcome message
  res.render('welcome', { name: userSession.username })

})


//Logging Out Our Users
app.get('/logout', (req, res) => {

  if (!req.cookies) {
    console.log(" no session_token cookie along with the request (which means that the requestor hasn’t logged in)")
    let errormessage = "Login first."
    res.render('welcome', { errormessage: errormessage })
    return
  }

  const sessionToken = req.cookies['session_token']
  if (!sessionToken) {
    console.log("the session token is not present in memory (which means that the requestor is sending us an invalid session token)")
    let errormessage = "Invalid Authentication.Try re-login."
    res.render('welcome', { errormessage: errormessage })
    return
  }

  delete sessions[sessionToken]

  res.cookie("session_token", "", { expires: new Date() })
  res.redirect("/")


})

*/

// 設定 port 3000
app.listen(3000, () => {
  console.log('App is running on http://localhost:3000')
})