const router = require('express').Router();
const { register, login, getMe, updateProfile, getAllUsers } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, getAllUsers);

module.exports = router;
