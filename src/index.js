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
    const hashedPassword = crypto.createHash("sha256").update(req.body.password, "utf-8").digest("hex");

    const doc = await client.query(
        q.Get(
            q.Match(q.Index("users_by_username"), req.body.username)
        )
    )
    .catch(e => console.log(e));

    console.log(doc);

    res.send("Authentication in development...");
});

app.listen(port, () => console.log(`Listening on port ${port}.`))