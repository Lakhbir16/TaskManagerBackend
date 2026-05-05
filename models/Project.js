const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Admin', 'Member'], default: 'Member' },
  joinedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    status: { type: String, enum: ['active', 'on-hold', 'completed', 'archived'], default: 'active' },
    deadline: { type: Date },
    color: { type: String, default: '#4f46e5' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
