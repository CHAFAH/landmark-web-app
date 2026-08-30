const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const { app, Student } = require('../index');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: { version: '7.0.4' }
  });
  await mongoose.connect(mongoServer.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Student.deleteMany({});
});

describe('POST /api/signup', () => {
  const validStudent = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '5551234567',
    course: 'DevOps Engineering'
  };

  test('creates a new student successfully', async () => {
    const res = await request(app).post('/api/signup').send(validStudent);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Jane Smith');
    expect(res.body.email).toBe('jane@example.com');
    expect(res.body.phone).toBe('5551234567');
    expect(res.body.course).toBe('DevOps Engineering');
    expect(res.body._id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  test('returns 400 for duplicate email', async () => {
    await request(app).post('/api/signup').send(validStudent);
    const res = await request(app).post('/api/signup').send(validStudent);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email already exists');
  });

  test('returns 400 for missing name', async () => {
    const res = await request(app).post('/api/signup').send({
      email: 'test@test.com', phone: '123', course: 'DevOps Engineering'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 for missing email', async () => {
    const res = await request(app).post('/api/signup').send({
      name: 'Test', phone: '123', course: 'DevOps Engineering'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 for missing phone', async () => {
    const res = await request(app).post('/api/signup').send({
      name: 'Test', email: 'test@test.com', course: 'DevOps Engineering'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 for missing course', async () => {
    const res = await request(app).post('/api/signup').send({
      name: 'Test', email: 'test@test.com', phone: '123'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('stores student in database', async () => {
    await request(app).post('/api/signup').send(validStudent);
    const students = await Student.find();
    expect(students).toHaveLength(1);
    expect(students[0].email).toBe('jane@example.com');
  });

  test('allows AI course selection', async () => {
    const res = await request(app).post('/api/signup').send({
      ...validStudent,
      course: 'AI & Machine Learning'
    });
    expect(res.status).toBe(201);
    expect(res.body.course).toBe('AI & Machine Learning');
  });
});

describe('GET /api/students', () => {
  test('returns empty array when no students', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all students', async () => {
    await Student.create([
      { name: 'A', email: 'a@a.com', phone: '1', course: 'DevOps Engineering' },
      { name: 'B', email: 'b@b.com', phone: '2', course: 'AI & Machine Learning' }
    ]);
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('returns students sorted by newest first', async () => {
    await Student.create({ name: 'First', email: 'first@a.com', phone: '1', course: 'DevOps Engineering', createdAt: new Date('2024-01-01') });
    await Student.create({ name: 'Second', email: 'second@a.com', phone: '2', course: 'DevOps Engineering', createdAt: new Date('2024-06-01') });

    const res = await request(app).get('/api/students');
    expect(res.body[0].name).toBe('Second');
    expect(res.body[1].name).toBe('First');
  });

  test('each student has required fields', async () => {
    await Student.create({ name: 'Test', email: 'test@test.com', phone: '999', course: 'DevOps Engineering' });
    const res = await request(app).get('/api/students');
    const student = res.body[0];
    expect(student).toHaveProperty('name');
    expect(student).toHaveProperty('email');
    expect(student).toHaveProperty('phone');
    expect(student).toHaveProperty('course');
    expect(student).toHaveProperty('createdAt');
  });
});
