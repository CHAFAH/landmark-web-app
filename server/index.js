const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const connectDB = async () => {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGO_URI environment variable is required in production');
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    console.log('Using in-memory MongoDB');
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  course: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', StudentSchema);

app.post('/api/signup', async (req, res) => {
  try {
    const student = await Student.create(req.body);
    console.log(`New signup: ${student.name} - ${student.email} - ${student.course}`);
    res.status(201).json(student);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/students', async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.json(students);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
}

module.exports = { app, connectDB, Student };
