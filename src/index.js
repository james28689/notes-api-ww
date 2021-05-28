require('dotenv').config()

const app = require('express')()
const cors = require('cors')
app.use(cors({
  origin: process.env.ALLOWED_URL,
  credentials: true,
}))

const faunadb = require('faunadb')
const client = new faunadb.Client({ secret: process.env.SECRET_KEY })

const { OAuth2Client } = require('google-auth-library')
const oauth_client = new OAuth2Client(process.env.CLIENT_ID)

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const q = faunadb.query

const port = process.env.PORT || 8080

const formatData = require('./formatData')
const randomKeyGen = require("./randomKeyGen")

var session = require("express-session")
const cookieParser = require('cookie-parser')
app.set('trust proxy', 1)
app.enable("trust proxy")
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

app.use(cookieParser())

app.post('/auth/google', async (req, res) => {
  const currentDate = new Date()

  const { token } = req.body
  const ticket = await oauth_client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID
  })

  const { name, email } = ticket.getPayload()
  
  const data = {
    email: email,
    username: name.split(" ").join("") + (Math.floor(Math.random() * 99)).toString(),
    name: name,
    dateJoined: q.Date(currentDate.toISOString().substring(0, 10))
  }

  const user = await client.query(
    q.Let(
      {
        ref: q.Match(q.Index("users_by_email"), data.email),
      },
      q.If(
        q.Exists(q.Var("ref")),
        q.Get(q.Var("ref")),
        q.Create(
          q.Collection("users"),
          { data: data }
        )
      )
    )
  )

  res.cookie("userID", user.ref.id)
  res.status(201)
  res.json({ user: user })
})

app.get('/note/user', async (req, res) => {
  console.log(req.cookies)

  const doc = await client.query(
    q.Map(
      q.Paginate(
        q.Match(
          q.Index('notes_by_user'),
          q.Ref(q.Collection('users'), req.cookies.userID)
        )
      ),
      q.Lambda('note', q.Get(q.Var('note')))
    )
  )
    .catch(e => console.log(e))

  console.log(doc)
  
  const notes = formatData.formatNoteArray(doc.data)
  res.json(notes)
})

app.get('/note/get/:noteID', async (req, res) => {
  const doc = await client.query(
    q.Get(
      q.Ref(
        q.Collection('notes'),
        req.params.noteID
      )
    )
  )
    .catch(e => {
      console.log(e)
      res.json(`Request failed with error: ${e}`)
    })

  const note = formatData.formatNote(doc)

  res.json(note)
})

app.delete('/note/delete/:noteID', async (req, res) => {
  await client.query(
    q.Delete(
      q.Ref(
        q.Collection('notes'),
        req.params.noteID
      )
    )
  )
    .catch(e => {
      console.log(e)
      res.send(`Failed to delete note with id ${req.params.noteID}.`)
    })

  res.send(`Deleted note with id ${doc.ref.id}.`)
})

app.post('/note/add', async (req, res) => {
  const currentDate = new Date()

  const data = {
    userRef: q.Ref(q.Collection('users'), req.cookies.userID),
    title: req.body.title,
    content: req.body.content,
    date: q.Date(currentDate.toISOString().substring(0, 10))
  }

  const doc = await client.query(
    q.Create(
      q.Collection('notes'),
      { data }
    )
  )
    .catch(e => {
      console.log(e)
      res.send('Failed to create note.')
    })

  res.send(`Created note with id ${doc.ref.id}`)
})

app.put('/note/update/:noteID', async (req, res) => {
  const currentDate = new Date()

  const data = {
    title: req.body.title,
    content: req.body.content,
    date: q.Date(currentDate.toISOString().substring(0, 10))
  }

  const doc = await client.query(
    q.Update(
      q.Ref(
        q.Collection('notes'),
        req.params.noteID
      ),
      { data }
    )
  )
    .catch(e => console.log(e))

  res.send(`Note with id ${doc.ref.id} updated.`)
})

app.delete('/auth/logout', async (req, res) => {
  res.status(200)
  res.json({
    message: 'Logged out successfully.'
  })
})

app.listen(port, () => console.log(`Listening on port ${port}.`))