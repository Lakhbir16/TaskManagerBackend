const Task = require('../models/Task');
const Project = require('../models/Project');

const populateTask = (q) =>
  q.populate('assignee', 'name email avatar')
   .populate('creator', 'name email avatar')
   .populate('project', 'name color')
   .populate('comments.author', 'name email avatar');

const assertProjectMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { ok: false, msg: 'Project not found.' };
  const member = project.members.find((m) => m.user.toString() === userId.toString());
  if (!member) return { ok: false, msg: 'You are not a member of this project.' };
  return { ok: true, project, memberRole: member.role };
};

exports.getTasks = async (req, res) => {
  try {
    const { project, assignee, status, priority, myTasks, overdue } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (assignee) filter.assignee = assignee;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (myTasks === 'true') filter.assignee = req.user._id;
    if (overdue === 'true') {
      filter.status = { $ne: 'done' };
      filter.dueDate = { $lt: new Date() };
    }
    if (!project) {
      const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
      filter.project = { $in: userProjects.map((p) => p._id) };
    }
    const tasks = await populateTask(Task.find(filter).sort({ createdAt: -1 }));
    res.json({ success: true, data: { tasks } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, project, assignee, priority, dueDate, tags } = req.body;
    if (!title || !project)
      return res.status(400).json({ success: false, message: 'Title and project are required.' });
    const { ok, msg } = await assertProjectMember(project, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: msg });
    const task = await Task.create({ title, description, project, assignee, priority, dueDate, tags, creator: req.user._id });
    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json({ success: true, data: { task: populated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const { ok, msg } = await assertProjectMember(task.project._id, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: msg });
    res.json({ success: true, data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const { ok, msg, memberRole } = await assertProjectMember(task.project, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: msg });
    const isAdmin = memberRole === 'Admin';
    const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
    if (!isAdmin && !isAssignee)
      return res.status(403).json({ success: false, message: 'You can only update tasks assigned to you.' });
    const { title, description, assignee, priority, dueDate, tags, status } = req.body;
    if (isAdmin) {
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (assignee !== undefined) task.assignee = assignee;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (tags) task.tags = tags;
    }
    if (status) task.status = status;
    await task.save();
    const updated = await populateTask(Task.findById(task._id));
    res.json({ success: true, data: { task: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const { ok, msg, memberRole } = await assertProjectMember(task.project, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: msg });
    if (memberRole !== 'Admin')
      return res.status(403).json({ success: false, message: 'Only project admins can delete tasks.' });
    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['todo', 'in-progress', 'review', 'done'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const { ok, msg } = await assertProjectMember(task.project, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: msg });
    task.status = status;
    await task.save();
    const updated = await populateTask(Task.findById(task._id));
    res.json({ success: true, data: { task: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Comment text is required.' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const { ok, msg } = await assertProjectMember(task.project, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: msg });
    task.comments.push({ author: req.user._id, text });
    await task.save();
    const updated = await populateTask(Task.findById(task._id));
    res.json({ success: true, data: { task: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
    const projectIds = userProjects.map((p) => p._id);
    const [total, todo, inProgress, review, done, overdue, myTasks] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'todo' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'in-progress' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'review' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'done' }),
      Task.countDocuments({ project: { $in: projectIds }, status: { $ne: 'done' }, dueDate: { $lt: new Date() } }),
      Task.countDocuments({ assignee: req.user._id, status: { $ne: 'done' } }),
    ]);
    const recentTasks = await populateTask(Task.find({ project: { $in: projectIds } }).sort({ createdAt: -1 }).limit(5));
    const overdueTasks = await populateTask(Task.find({ project: { $in: projectIds }, status: { $ne: 'done' }, dueDate: { $lt: new Date() } }).sort({ dueDate: 1 }).limit(5));
    res.json({
      success: true,
      data: {
        stats: { total, todo, inProgress, review, done, overdue, myTasks, projects: projectIds.length },
        recentTasks,
        overdueTasks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
