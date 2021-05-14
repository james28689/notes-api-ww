const app = require("express")();

const faunadb = require("faunadb");
const { SECRET_KEY } = require("./config");
const client = new faunadb.Client({secret: SECRET_KEY});

const bodyParser = require("body-parser");
app.use(bodyParser.json());

const q = faunadb.query;

app.get("/getNotes", async (req, res) => {
    const doc = await client.query(
        q.Map(
            q.Paginate(q.Documents(q.Collection("notes"))),
            q.Lambda("X", q.Get(q.Var("X")))
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

    res.send(doc);
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

    res.send(doc);
})

app.listen(5000, () => console.log("Listening on port 5000 at http://localhost:5000/"))