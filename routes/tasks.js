const router = require('express').Router();
const {
  getTasks, createTask, getTask,
  updateTask, deleteTask, updateStatus,
  addComment, getDashboardStats,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.put('/:id/status', updateStatus);
router.post('/:id/comments', addComment);

module.exports = router;
