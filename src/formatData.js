module.exports.formatNoteArray = (data) => {
  var notes = []

  for (var i in data) {
    notes.push(this.formatNote(data[i]))
  }

  return notes
}

module.exports.formatNote = (data) => {
  return {
    id: parseInt(data.ref.id),
    userID: data.data.userRef.id,
    parentId: parseInt(data.data.folderRef.id),
    title: data.data.title,
    content: data.data.content,
    type: "file",
    date: Date(data.data.date['@date'])
  }
}

module.exports.formatFolderArray = (data) => {
  var folders = []

  for (var i in data) {
    folders.push(this.formatFolder(data[i]))
  }

  return folders
}

module.exports.formatFolder = (data) => {
  var parentID;
  if (data.data.parentID === 0) {
    parentID = null
  } else {
    parentID = parseInt(data.data.parentID)
  }

  return {
    id: parseInt(data.ref.id),
    userID: data.data.userRef.id,
    parentId: parentID,
    type: "folder",
    name: data.data.name
  }
}

module.exports.formatUser = (data) => {
  return {
    userID: data.ref.id,
    email: data.data.email,
    username: data.data.username,
    name: data.data.name,
    dateJoined: Date(data.data.dateJoined['@date'])
  }
}