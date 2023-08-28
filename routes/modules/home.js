// 引用 Express 與 Express 路由器
const express = require('express')
const router = express.Router()

// 載入 User model
const User = require('../../models/user')

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

// 設定首頁路由
router.get('/', (req, res) => {
  res.render('login')
})


// 設定login路由
router.post('/login', (req, res) => {
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
router.get('/welcome', (req, res) => {

  console.log(req.cookies)
  //Authenticating Users Through Session Cookies:
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

  // If all checks have passed, we can consider the user authenticated and send a welcome message
  res.render('welcome', { name: userSession.username })

})

// 設定refresh路由
router.post('/refresh', (req, res) => {

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
router.get('/logout', (req, res) => {

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


// 匯出路由模組
module.exports = router
