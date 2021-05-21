const app = require("express")();
const cors = require("cors");
app.use(cors());

require("dotenv").config()

const faunadb = require("faunadb");
const client = new faunadb.Client({secret: process.env.SECRET_KEY });

const bodyParser = require("body-parser");
app.use(bodyParser.json());

const q = faunadb.query;

var port = process.env.PORT || 8080;

var crypto = require("crypto");

app.get("/getNotes", async (req, res) => {
    const doc = await client.query(
        q.Map(
            q.Paginate(q.Documents(q.Collection("notes"))),
            q.Lambda("note", q.Get(q.Var("note")))
        )
    )
    .catch(e => console.log(e));

    res.send(doc);
})

app.get("/getUserNotes/:userID", async (req, res) => {
    const doc = await client.query(
        q.Map(
            q.Paginate(
                q.Match(
                    q.Index("notes_by_user"),
                    q.Ref(q.Collection("users"), req.params.userID)
                )
            ),
            q.Lambda("note", q.Get(q.Var("note")))
        )
    )
    .catch(e => console.log(e));

    let noteData = doc.data;
    var notes = [];

    for (var i in noteData) {
        notes.push({
            noteID: noteData[i].ref.id,
            userID: noteData[i].data.userRef.id,
            title: noteData[i].data.title,
            content: noteData[i].data.content,
            date: Date(noteData[i].data.date["@date"])
        });
    }


    res.json(notes);
})

app.get("/getNote/:noteID", async (req, res) => {
    const doc = await client.query(
        q.Get(
            q.Ref(
                q.Collection("notes"),
                req.params.noteID
            )
        )
    )
    .catch(e => console.log(e));

    res.send(doc);
})

app.delete("/deleteNote/:noteID", async (req, res) => {
    console.log(req.params.noteID)
    await client.query(
        q.Delete(
            q.Ref(
                q.Collection("notes"),
                req.params.noteID
            )
        )
    )
    .catch(e => console.log(e));

    res.send(`Deleted note with id ${req.params.noteID}`)
})

app.post("/addNote", async (req, res) => {
    const data = {
        userRef: q.Ref(q.Collection("users"), req.body.userID),
        title: req.body.title,
        content: req.body.content,
        date: q.Date(req.body.date)
    }

    const doc = await client.query(
        q.Create(
            q.Collection("notes"),
            { data }
        )
    )
    .catch(e => console.log(e));

    res.send(`Created note.`);
})

app.put("/updateNote/:noteID", async (req, res) => {
    const data = {
        title: req.body.title,
        content: req.body.content,
        date: q.Date(req.body.date)
    }

    const doc = await client.query(
        q.Update(
            q.Ref(
                q.Collection("notes"),
                req.params.noteID
            ),
            { data }
        )
    )
    .catch(e => console.log(e))

    res.send(doc);
})

app.get("/user/authenticate", async (req, res) => {
    const givenPasswordHash = crypto.createHash("sha256").update(req.body.password, "utf-8").digest("hex");

    const doc = await client.query(
        q.Get(
            q.Match(q.Index("users_by_username"), req.body.username)
        )
    )
    .catch(e => console.log(e));

    if (doc.data.passwordHash == givenPasswordHash) {
        res.json({
            "authenticated": true,
            "userID": doc.ref.id,
        });
    } else {
        res.json({
            "authenticated": false
        });
    }
});

app.post("/user/create", async (req, res) => {
    const givenPasswordHash = crypto.createHash("sha256").update(req.body.password, "utf-8").digest("hex");

    let currentDate = new Date();

    const data = {
        email: req.body.email,
        username: req.body.username,
        passwordHash: givenPasswordHash,
        name: {
            first: req.body.firstName,
            last: req.body.lastName
        },
        dateJoined: q.Date(currentDate.toISOString().substring(0,10))
    }

    const doc = await client.query(
        q.Create(
            q.Collection("users"),
            { data }
        )
    )
    .catch(e => console.log(e))

    res.send(doc);
});

app.put("/user/changePassword/:userID", async (req, res) => {
    const givenPasswordHash = crypto.createHash("sha256").update(req.body.password, "utf-8").digest("hex");

    const doc = await client.query(
        q.Update(
            q.Ref(
                q.Collection("users"),
                req.params.userID
            ),
            {
                passwordHash: givenPasswordHash,
            }
        )
    )
    .catch(e => console.log(e));

    res.send(doc);
});

app.put("/user/update/:userID", async (req, res) => {
    const doc = await client.query(
        q.Update(
            q.Ref(
                q.Collection("users"),
                req.params.userID
            ),
            {
                email: req.body.email,
                name: {
                    first: req.body.firstName,
                    last: req.body.lastName
                }
            }
        )
    )
    .catch(e => console.log(e));

    res.send(doc);
});

app.delete("/user/delete/:userID", async (req, res) => {
    const doc2 = await client.query(
        q.Map(
            q.Paginate(
                q.Match(
                    Index("notes_by_user"),
                    q.Ref(
                        q.Collection("users"),
                        req.params.userID
                    )
                )
            ),
            q.Lambda("note", Delete(Var("note")))
        )
    )
    .catch(e => console.log(e));

    const doc = await client.query(
        q.Delete(
            q.Ref(
                q.Collection("users"),
                req.params.userID
            )
        )
    )
    .catch(e => console.log(e));

    res.send(doc, doc2);
});

app.listen(port, () => console.log(`Listening on port ${port}.`))