const impl = require("./impl");
var db = require('../database/models/index');
var path = require('path');
var client = db.client;
var ProjectConfiguration = db.projectConfiguration;


module.exports = function (app, express) {
  app.get('/contractInteraction/project/:projectName', isLoggedIn, impl.contractInteraction);
  app.get('/contractInteraction/project/:projectName/contractData', impl.contractData);
  // app.get('/contractInteraction/project', (req,res) => { console.log("here"); res.redirect('/'); });

  app.get('/icoDashboardSetup/project/:projectName', isLoggedIn, hasVerified, hasPackage3, impl.icoDashboardSetup);
  app.get('/siteConfiguration/project/:projectName', isLoggedIn, hasVerified, hasPackage3, impl.siteConfiguration);
  app.get('/siteConfiguration/project/:projectName/getSiteConfiguration', hasVerified, isLoggedIn, impl.getSiteConfiguration);
  app.post('/siteConfiguration/project/:projectName/updateSiteConfiguration', isLoggedIn, impl.updateSiteConfiguration)
  app.get('/transaction', impl.getTransaction)
  app.get('/transactionData', impl.getTransactionData)

  app.get('/icoDashboardSetup/project/:projectName/kyctab', impl.getKYCPage);
  app.get('/icoDashboardSetup/project/:projectName/kyctab/getICOdata', impl.getICOdata);
  app.get('/icoDashboardSetup/project/:projectName/kyctab/:uniqueId/getUserData', impl.getUserData);
  app.post('/icoDashboardSetup/project/:projectName/kyctab/:uniqueId/updateUserData', impl.updateUserData);

  app.get('/:projectName/userSignup', impl.getUserSignup);
  app.get('/:projectName/userLogin', impl.getUserLogin);
  app.post('/:projectName/userSignup', impl.postUserSignup);
  app.post('/:projectName/userLogin', impl.postUserLogin);
  app.get('/verifyMail', impl.verifyMail);
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');

}


// route middleware to check package 2
function hasPackage3(req, res, next) {
  ProjectConfiguration.find({
    where: {
      'client_id': req.user.uniqueId,
      'coinName': req.params.projectName
    }
  }).then(result => {
    if (result.dataValues.isAllowedForICO == true) {
      return next();
    } else {
      req.flash('package_flash', 'You need to buy Package 3');
      res.redirect('/dashboard');
    }
  })
}

function hasVerified(req, res, next) {
  client.find({
    where: {
      'email': req.user.email
    }
  }).then(result => {
    console.log(result.dataValues.kyc_verified, "hello");
    switch (result.dataValues.kyc_verified) {
      case "active":
        { next(); }
        break;
      case "pending":
        { res.redirect('/KYCpage/pending'); }
        break;
      case "notInitiated":
        { res.redirect('/KYCpage'); }
        break;
      default:
        { res.redirect('/'); }
        break;
    }
  })
}
