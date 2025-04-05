const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');
const realmController = require('../controllers/realmController');
const userController = require('../controllers/userController');

router.post('/auth/master/login', loginController.getMasterAccessToken);
router.post('/auth/login', loginController.getRealmAccessToken);
// router.post('/auth/client/login', loginController.getRealmUserAccessToken);
router.post('/auth/create', realmController.createRealm);
router.post('/roles/create', realmController.createRoles);
router.get('/auth/clientid/enable/:realm', realmController.enableClientId);
router.post('/auth/user/create', userController.createUser);
router.get('/auth/user/:account/:name',userController.getUserIdByName);
router.post('/ldapConnection',userController.ldabVerification);


// router.post('/data', apiController.postData);

module.exports = router;