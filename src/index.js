const app = require('express')()
const cors = require('cors')
app.use(cors())

require('dotenv').config()

const faunadb = require('faunadb')
const client = new faunadb.Client({ secret: process.env.SECRET_KEY })

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const q = faunadb.query

const port = process.env.PORT || 8080

const formatData = require('./formatData')
const randomKeyGen = require("./randomKeyGen")

const cookieSession = require("cookie-session");

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
}, function (accessToken, refreshToken, profile, cb) {

  console.log(profile)

  const currentDate = new Date()
    const user = {
      email: profile._json.email,
      username: profile.displayName,
      name: profile._json.name,
      dateJoined: currentDate.toISOString()
    }

  const result = client.query(
    q.Let(
      {
        ref: q.Match(q.Index("users_by_email"), profile._json.email),
      },
      q.If(
        q.Exists(q.Var("ref")),
        q.Get(q.Var("ref")),
        q.Create(
          q.Collection("users"),
          { data: user }
        )
      )
    )
  )
  .then(ret =>  {
    const dbUser = ret
    console.log(dbUser)
    return cb(null, dbUser);
  })
}
))

passport.serializeUser(function (user, done) {
  done(null, user);
})

passport.deserializeUser(function (user, done) {
  done(null, user);
})

app.use(cookieSession({
  name: "session-name",
  keys: ["key1", "key2"]
}))

app.use(passport.initialize());
app.use(passport.session());

const checkUserLoggedIn = (req, res, next) => {
  req.user ? next() : res.sendStatus(401);
}

app.get("/auth/success", checkUserLoggedIn, (req, res) => {
  res.json({ displayName: req.user })
})

app.get("/auth/failed", (req, res) => {
  res.json({ message: "Authentication failure." })
})

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/cb", passport.authenticate("google", { failureRedirect: "/auth/failed" }),
  function (req, res) {
    res.redirect("/auth/success");
  }
)

app.get("/auth/logout", (req, res) => {
  req.session = null;
  req.logout()
  res.redirect("https://www.google.com")
})

app.get('/note/user', checkUserLoggedIn, async (req, res) => {
  const doc = await client.query(
    q.Map(
      q.Paginate(
        q.Match(
          q.Index('notes_by_user'),
          q.Ref(q.Collection("users"), req.user.ref["@ref"].id)
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

// app.post('/auth/google', async (req, res) => {
//   const currentDate = new Date()

//   const { token } = req.body
//   const ticket = await oauth_client.verifyIdToken({
//     idToken: token,
//     audience: process.env.GOOGLE_CLIENT_ID
//   })

//   const { name, email } = ticket.getPayload()

//   const userExists = await client.query(
//     q.Exists(q.Match(q.Index("users_by_email"), email))
//   )

//   if (userExists) {
//     const user = await client.query(
//       q.Get(
//         q.Match(
//           q.Index("users_by_email"),
//           email
//         )
//       )
//     )
//     const key = randomKeyGen.genTimeKey();
  
//     let keyData = {
//       userID: user.ref.id,
//       key: key
//     }

//     await client.query(
//       q.Create(
//         q.Collection("keys"),
//         {
//           data: { keyData }
//         }
//       )
//     )
//     .catch(e => console.log(e))

//     res.status(201)
//     res.json({ user: user, key: key })
//   } else {
//     const data = {
//       email: email,
//       username: name + (Math.floor(Math.random() * 99)).toString(),
//       name: name,
//       dateJoined: q.Date(currentDate.toISOString().substring(0, 10))
//     }

//     const user = await client.query(
//       q.Create(
//         q.Collection("users"),
//         {
//           data
//         }
//       )
//     )
//     .catch(error => console.log(error));

//     const key = randomKeyGen.genTimeKey();
  
//     const keyData = {
//       userID: user.ref.id,
//       key: key
//     }

//     console.log(keyData);

//     const doc = await client.query(
//       q.Create(
//         q.Collection("keys"),
//         {
//           date: { keyData }
//         }
//       )
//     )
//     .catch(e => console.log(e))

//     res.status(201)
//     res.json({ user: user, key: key })
//   }
// })

// app.use(async (req, res, next) => {
//   console.log("HOLA")

//   const user = await client.query(
//     q.Get(
//       q.Ref(
//         q.Collection('users'),
//         req.session.userID
//       )
//     )
//   )
//     .catch(e => res.send('Unauthorised user.'))

//   req.user = user
//   next()
// })