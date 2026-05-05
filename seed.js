require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([User.deleteMany(), Project.deleteMany(), Task.deleteMany()]);

  const [admin, alice, bob] = await User.create([
    { name: 'Admin User', email: 'admin@demo.com', password: 'password123', role: 'Admin' },
    { name: 'Alice Johnson', email: 'alice@demo.com', password: 'password123', role: 'Member' },
    { name: 'Bob Smith', email: 'bob@demo.com', password: 'password123', role: 'Member' },
  ]);

  const [proj1, proj2] = await Project.create([
    {
      name: 'Website Redesign',
      description: 'Complete redesign of the company website.',
      owner: admin._id,
      color: '#4f46e5',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      members: [
        { user: admin._id, role: 'Admin' },
        { user: alice._id, role: 'Member' },
        { user: bob._id, role: 'Member' },
      ],
    },
    {
      name: 'Mobile App v2',
      description: 'New version of the mobile app.',
      owner: admin._id,
      color: '#7c3aed',
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      members: [
        { user: admin._id, role: 'Admin' },
        { user: alice._id, role: 'Member' },
      ],
    },
  ]);

  await Task.create([
    {
      title: 'Design homepage hero section',
      description: 'Create a new hero section layout.',
      project: proj1._id, creator: admin._id, assignee: alice._id,
      status: 'in-progress', priority: 'high',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      tags: ['design', 'ui'],
    },
    {
      title: 'Set up CI/CD pipeline',
      project: proj1._id, creator: admin._id, assignee: bob._id,
      status: 'todo', priority: 'medium',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      tags: ['devops'],
    },
    {
      title: 'Write API documentation',
      project: proj1._id, creator: admin._id, assignee: alice._id,
      status: 'review', priority: 'medium',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      tags: ['docs'],
    },
    {
      title: 'Fix login page validation',
      project: proj1._id, creator: alice._id, assignee: bob._id,
      status: 'done', priority: 'low',
      tags: ['bug'],
    },
    {
      title: 'Implement push notifications',
      project: proj2._id, creator: admin._id, assignee: alice._id,
      status: 'todo', priority: 'critical',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tags: ['mobile'],
    },
    {
      title: 'Optimize database queries',
      project: proj2._id, creator: admin._id, assignee: admin._id,
      status: 'in-progress', priority: 'high',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tags: ['backend'],
    },
  ]);

  console.log('Seed done!');
  console.log('admin@demo.com / password123  (Admin)');
  console.log('alice@demo.com / password123  (Member)');
  console.log('bob@demo.com   / password123  (Member)');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
