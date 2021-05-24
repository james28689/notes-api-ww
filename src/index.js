const app = require('express')()
const cors = require('cors')
app.use(cors())

require('dotenv').config()

const faunadb = require('faunadb')
const client = new faunadb.Client({ secret: process.env.SECRET_KEY })

const { OAuth2Client } = require('google-auth-library')
const oauth_client = new OAuth2Client(process.env.CLIENT_ID)

const bodyParser = require('body-parser')
app.use(bodyParser.json())

const q = faunadb.query

const port = process.env.PORT || 8080

const formatData = require('./formatData')

var cookieParser = require("cookie-parser");
var session = require("express-session");

app.use(cookieParser());

app.use(session({
  secret: "random text that I'm typing out shhhhh",
  cookie: { secure: false }
}))

app.get('/note/user', async (req, res) => {
  const doc = await client.query(
    q.Map(
      q.Paginate(
        q.Match(
          q.Index('notes_by_user'),
          q.Ref(q.Collection('users'), req.session.userID)
        )
      ),
      q.Lambda('note', q.Get(q.Var('note')))
    )
  )
    .catch(e => console.log(e))

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
  console.log(req.params.noteID)
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
    userRef: q.Ref(q.Collection('users'), req.session.userID),
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

app.post('/auth/google', async (req, res) => {
  const currentDate = new Date()

  const { token } = req.body
  const ticket = await oauth_client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID
  })

  const { name, email } = ticket.getPayload()

  try {
    const doc = await client.query(
      q.Get(
        q.Match(
          q.Index('users_by_email'),
          email
        )
      )
    )
  } catch (error) {
    const data = {
      email: email,
      username: name + (Math.floor(Math.random() * 99)).toString(),
      name: name,
      dateJoined: q.Date(currentDate.toISOString().substring(0, 10))
    }
    
    const doc = await client.query(
      q.Create(
        q.Collection('users'),
        {
          data
        }
      )
    )
    .catch(error2 => console.log(error2))
  }

  req.session.userID = doc.ref.id

  res.status(201)
  res.json(doc)
})

app.use(async (req, res, next) => {
  const user = await client.query(
    q.Get(
      q.Ref(
        q.Collection('users'),
        req.session.userID
      )
    )
  )
    .catch(e => res.send('Unauthorised user.'))

  req.user = user
  next()
})

app.delete('/auth/logout', async (req, res) => {
  await req.session.destroy()
  res.status(200)
  res.json({
    message: 'Logged out successfully.'
  })
})

app.get('/me', async (req, res) => {
  res.status(200)
  res.json(req.user)
})

app.listen(port, () => console.log(`Listening on port ${port}.`))

// app.get("/note/all", async (req, res) => {
//     const doc = await client.query(
//         q.Map(
//             q.Paginate(q.Documents(q.Collection("notes"))),
//             q.Lambda("note", q.Get(q.Var("note")))
//         )
//     )
//     .catch(e => console.log(e));

//     let notes = formatData.formatNoteArray(doc.data);

//     res.json(notes);
// });
