const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


var Schema = mongoose.Schema;

var exerciseUsersSchema = new Schema({
  username: { type: String, unique: true, required: true }
});

var ExerciseUsers = mongoose.model('ExerciseUsers', exerciseUsersSchema);

var exercisesSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date, default: Date.now }
});

var Exercises = mongoose.model('Exercises', exercisesSchema);

app.post('/api/exercise/new-user', function(req, res) {
  let username = req.body.username;
  let _id = '';
  
  ExerciseUsers.findOne({ username: username }, function(err, data) {
    if (!err && data === null) {
      let newUser = new ExerciseUsers({
        username: username
      });

      newUser.save(function(err, data) {
        if (!err) {
          _id = data['_id'];
          
          return res.json({ username: username, _id: _id });
        }
      });
    } else {
      return res.json({ error: 'username already exists' });
    }
  });
});

app.post('/api/exercise/add', function(req, res) {
  if (req.body.userId === '') {
    return res.json({ error: 'userId is required' });
  }
  
  if (req.body.description === '') {
    return res.json({ error: 'description is required' });
  }
  
  if (req.body.duration === '') {
    return res.json({ error: 'duration is required' });
  }
  
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = (req.body.date !== '' ? new Date(req.body.date) : new Date());
  
  ExerciseUsers.findById(userId, function(err, data) {
    if (!err && data !== null) {
      let newExercise = new Exercises({
        userId: userId,
        description: description,
        duration: duration,
        date: date
      });

      newExercise.save(function(err2, data2) {
        if (!err2) {
          return res.json({ username: data['username'], _id: data['_id'], description: data2['description'], duration: data2['duration'], date: data2['date'] });
        }
      });
    } else {
      return res.json({ error: 'user not found' });
    }
  });
});

app.get('/api/exercise/users', function(req, res) {
  ExerciseUsers.find({}, function(err, data) {
    if (!err) {
      return res.json(data);
    }
  });
});

app.get('/api/exercise/log', function(req, res) {
  if (req.query.userId === undefined || req.query.userId === '') {
    return res.json({ error: 'userId is required' });
  }
  
  let userId = req.query.userId;
  let findConditions = { userId: userId };
  
  if ((req.query.from !== undefined && req.query.from !== '') || (req.query.to !== undefined && req.query.to !== '')) {
    findConditions.date = {};
    
    if (req.query.from !== undefined && req.query.from !== '') {
      findConditions.date.$gte = new Date(req.query.from);
    }
    
    if (req.query.to !== undefined && req.query.to !== '') {
      findConditions.date.$lte = new Date(req.query.to);
    }
  }
  
  let limit = (req.query.limit !== '' ? parseInt(req.query.limit) : 0);
  
  ExerciseUsers.findById(userId, function(err, data) {
    if (!err && data !== null) {
      Exercises.find(findConditions).sort({ date: 'asc' }).limit(limit).exec(function(err2, data2) {
        if (!err2) {
          return res.json({
            username: data['username'],
            _id: data['_id'],
            log: data2.map(function(e) { return { description: e.description, duration: e.duration, date: e.date }; }),
            count: data2.length
          });
        }
      });
    } else {
      return res.json({ error: 'user not found' });
    }
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
