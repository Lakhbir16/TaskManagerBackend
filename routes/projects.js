const router = require('express').Router();
const {
  getProjects, createProject, getProject,
  updateProject, deleteProject, addMember,
  removeMember, getProjectStats,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.route('/:id/members').post(addMember);
router.route('/:id/members/:userId').delete(removeMember);
router.route('/:id/stats').get(getProjectStats);

module.exports = router;
