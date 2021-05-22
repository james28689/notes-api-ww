# API For Notes App

Created using FaunaDB, node.js, and express

## Return Types:
### Note:
    - noteID
    - userID
    - title
    - content
    - date
## User:
    - userID
    - email
    - name {
        - first
        - last
    }
    - dateJoined

# Endpoints:
## /note:
### /all:
    - Takes no input.
    - Returns all stored notes as array of notes.
### /user/{userID}:
    - Takes user ID in request parameters.
    - Returns all notes belonging to user as array of notes.
### /get/{noteID}:
    - Takes note ID in request parameters.
    - Returns single formatted note.
### /delete/{noteID}:
    - Takes note ID in request parameters.
    - Returns message confirming completion.
### /add
    - Takes note data as JSON in request body.
    - Returns confirmation message.
### /update/{noteID}:
    - Takes note ID in request parameters and data as JSON in request body.
    - Sends confirmation message.
## /user:
### /authenticate:
    - Takes username and password as JSON in request body.
    - Sends authentication status (true/false) and formatted user data.
### /create:
    - Takes user data and password hash as JSON in request body.
    - Sends formatted user data back.
### ...