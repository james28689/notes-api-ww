module.exports.formatNoteArray = (data) => {
  const notes = []

  for (const i in data) {
    notes.push(this.formatNote(data[i]))
  }

  return notes
}

module.exports.formatNote = (data) => {
  return {
    noteID: data.ref.id,
    userID: data.data.userRef.id,
    title: data.data.title,
    content: data.data.content,
    date: Date(data.data.date['@date'])
  }
}

module.exports.formatUser = (data) => {
  return {
    userID: data.ref.id,
    email: data.data.email,
    username: data.data.username,
    name: {
      first: data.data.name.first,
      last: data.data.name.last
    },
    dataJoined: Date(data.data.dateJoined['@date'])
  }
}