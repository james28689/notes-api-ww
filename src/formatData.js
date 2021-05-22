module.exports.formatNoteArray = (data) =>  {
    var notes = [];

    for (var i in data) {
        notes.push({
            noteID: data[i].ref.id,
            userID: data[i].data.userRef.id,
            title: data[i].data.title,
            content: data[i].data.content,
            date: Date(noteData[i].data.date["@date"])
        });
    }

    return notes
}