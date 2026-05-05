const Project = require('../models/Project');
const Task = require('../models/Task');

const populate = (q) =>
  q.populate('owner', 'name email avatar role').populate('members.user', 'name email avatar role');

const isMember = (project, userId) =>
  project.members.some((m) => m.user._id.toString() === userId.toString());

const isProjectAdmin = (project, userId) =>
  project.owner._id.toString() === userId.toString() ||
  project.members.some((m) => m.user._id.toString() === userId.toString() && m.role === 'Admin');

exports.getProjects = async (req, res) => {
  try {
    const projects = await populate(Project.find({ 'members.user': req.user._id }));
    const projectsWithStats = await Promise.all(
      projects.map(async (p) => {
        const [taskCount, doneCount, overdueCount] = await Promise.all([
          Task.countDocuments({ project: p._id }),
          Task.countDocuments({ project: p._id, status: 'done' }),
          Task.countDocuments({ project: p._id, status: { $ne: 'done' }, dueDate: { $lt: new Date() } }),
        ]);
        return { ...p.toObject(), taskCount, doneCount, overdueCount };
      })
    );
    res.json({ success: true, data: { projects: projectsWithStats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, description, deadline, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Project name is required.' });
    const project = await Project.create({
      name, description, deadline,
      color: color || '#4f46e5',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }],
    });
    const populated = await populate(Project.findById(project._id));
    res.status(201).json({ success: true, data: { project: populated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await populate(Project.findById(req.params.id));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!isMember(project, req.user._id))
      return res.status(403).json({ success: false, message: 'Access denied.' });
    res.json({ success: true, data: { project } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await populate(Project.findById(req.params.id));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!isProjectAdmin(project, req.user._id))
      return res.status(403).json({ success: false, message: 'Only project admins can do this.' });
    const { name, description, deadline, status, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (deadline !== undefined) project.deadline = deadline;
    if (status) project.status = status;
    if (color) project.color = color;
    await project.save();
    const updated = await populate(Project.findById(project._id));
    res.json({ success: true, data: { project: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Only the owner can delete this project.' });
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });
    const project = await populate(Project.findById(req.params.id));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!isProjectAdmin(project, req.user._id))
      return res.status(403).json({ success: false, message: 'Only project admins can add members.' });
    if (project.members.some((m) => m.user._id.toString() === userId))
      return res.status(400).json({ success: false, message: 'User is already a member.' });
    project.members.push({ user: userId, role: role || 'Member' });
    await project.save();
    const updated = await populate(Project.findById(project._id));
    res.json({ success: true, data: { project: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const project = await populate(Project.findById(req.params.id));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!isProjectAdmin(project, req.user._id))
      return res.status(403).json({ success: false, message: 'Only project admins can remove members.' });
    if (project.owner._id.toString() === req.params.userId)
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner.' });
    project.members = project.members.filter((m) => m.user._id.toString() !== req.params.userId);
    await project.save();
    const updated = await populate(Project.findById(project._id));
    res.json({ success: true, data: { project: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectStats = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    const statuses = ['todo', 'in-progress', 'review', 'done'];
    const counts = await Promise.all(statuses.map((s) => Task.countDocuments({ project: project._id, status: s })));
    const stats = {};
    statuses.forEach((s, i) => (stats[s] = counts[i]));
    const overdue = await Task.countDocuments({ project: project._id, status: { $ne: 'done' }, dueDate: { $lt: new Date() } });
    res.json({ success: true, data: { stats: { ...stats, overdue } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
