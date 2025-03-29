const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');
const realmController = require('../controllers/realmController');
const userController = require('../controllers/userController');

router.post('/auth/master/login', loginController.getMasterAccessToken);
router.post('/auth/login', loginController.getRealmAccessToken);
router.post('/auth/create', realmController.createRealm);
router.post('/roles/create', realmController.createRoles);
router.post('/auth/user/create', userController.createUser);


// router.post('/data', apiController.postData);

module.exports = router;