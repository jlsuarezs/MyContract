const fs = require("fs");
const path = require("path");
const nodemailerAuth = require("../config/auth").nodemailerAuth;
var coin, templateCoin, mintableContract, burnableContract, releaseableContract, upgradeableContract;
var fileReader = require('../filereader/impl');
var result;
var ejs = require("ejs");
var db = require('../database/models/index');
var ProjectConfiguration = db.projectConfiguration;
var client = db.client;
var nodemailerservice = require('../emailer/impl');
module.exports = {

  getCustomContractForm: async (req, res) => {
    var projectArray = await getProjectArray(req.user.email);
    var address = req.cookies['address'];
    res.render('customContract', {
      user: req.user,
      message: req.flash('package_flash'),
      message2: req.flash('project_flash'),
      address: address,
      ProjectConfiguration: projectArray,
    });
  },
  getERC223ContractForm: async (req, res) => {
    var projectArray = await getProjectArray(req.user.email);
    var address = req.cookies['address'];
    res.render('ERC223Contract', {
      user: req.user,
      message: req.flash('package_flash'),
      message2: req.flash('project_flash'),
      address: address,
      ProjectConfiguration: projectArray,
    });
  },

  getERC721ContractForm: async (req, res) => {
    var projectArray = await getProjectArray(req.user.email);
    var address = req.cookies['address'];
    res.render('erc721', {
      user: req.user,
      message: req.flash('package_flash'),
      message2: req.flash('project_flash'),
      address: address,
      ProjectConfiguration: projectArray,
    });
  },
  createERC20Contract: async (req, res) => {
    console.log(req.body);
    var Roles = await fileReader.readEjsFile(__dirname + '/ERC20contracts/Roles.sol');
    var ERC20 = await fileReader.readEjsFile(__dirname + '/ERC20contracts/ERC20.sol');
    var ERC20Detailed = await fileReader.readEjsFile(__dirname + '/ERC20contracts/ERC20Detailed.sol');
    var IERC20 = await fileReader.readEjsFile(__dirname + '/ERC20contracts/IERC20.sol');
    var Ownable = await fileReader.readEjsFile(__dirname + '/ERC20contracts/Ownable.sol');
    var SafeERC20 = await fileReader.readEjsFile(__dirname + '/ERC20contracts/SafeERC20.sol');
    var SafeMath = await fileReader.readEjsFile(__dirname + '/ERC20contracts/SafeMath.sol');
    var SignerRole = await fileReader.readEjsFile(__dirname + '/ERC20contracts/SignerRole.sol');
    var isPausable = (req.body.isPausable == "on") ? true : false;
    var isBurnable = (req.body.isBurnable == "on") ? true : false;
    var isMintable = (req.body.isMintable == "on") ? true : false;
    var isUpgradeable = (req.body.isUpgradeable == "on") ? true : false;
    var ERC20CappedSign = "";
    inherits = "";

    if (isBurnable) {
      var ERC20Burnable = await fileReader.readEjsFile(__dirname + '/ERC20contracts/ERC20Burnable.sol');
      inherits += ", ERC20Burnable";
    }
    if (isPausable) {
      var Pausable = await fileReader.readEjsFile(__dirname + '/ERC20contracts/Pausable.sol');
      var PauserRole = await fileReader.readEjsFile(__dirname + '/ERC20contracts/PauserRole.sol');
      var ERC20Pausable = await fileReader.readEjsFile(__dirname + '/ERC20contracts/ERC20Pausable.sol');
      inherits += " , ERC20Pausable";
    }
    if (isMintable) {
      var MinterRole = await fileReader.readEjsFile(__dirname + '/ERC20contracts/MinterRole.sol');
      var ERC20Capped = await fileReader.readEjsFile(__dirname + '/ERC20contracts/ERC20Capped.sol');
      var ERC20Mintable = await fileReader.readEjsFile(__dirname + '/ERC20contracts/ERC20Mintable.sol');
      var CapperRole = await fileReader.readEjsFile(__dirname + '/ERC20contracts/CapperRole.sol');
      var ERC20Capped = await fileReader.readEjsFile(__dirname + '/ERC20contracts/ERC20Capped.sol');

      ERC20CappedSign = "ERC20Capped(" + req.body.token_supply * 10 + "000000000000000000)"
      inherits += ", ERC20Mintable,ERC20Capped";
    }
    if (isUpgradeable) {
      var Upgradable = await fileReader.readEjsFile(__dirname + '/ERC20contracts/Upgradable.sol');
      inherits += " , Upgradeable";
    }
    ejs.renderFile(__dirname + '/ERC20contracts/Coin.sol', {
      "SafeERC20": SafeERC20,
      "SafeMath": SafeMath,
      "IERC20": IERC20,
      "ERC20": ERC20,
      "ERC20Capped": ERC20Capped,
      "ERC20Detailed": ERC20Detailed,
      "MinterRole": MinterRole,
      "Ownable": Ownable,
      "Pausable": Pausable,
      "PauserRole": PauserRole,
      "Roles": Roles,
      "CapperRole": CapperRole,
      "SignerRole": SignerRole,
      "ERC20Burnable": ERC20Burnable,
      "ERC20Pausable": ERC20Pausable,
      "Upgradable": Upgradable,
      "ERC20Mintable": ERC20Mintable,
      //data from form
      totalSupply: req.body.token_supply,
      name: req.body.token_name,
      symbol: req.body.token_symbol,
      decimal: req.body.token_decimals,
      decimalInZero: "000000000000000000",
      ERC20CappedSign: ERC20CappedSign
    }, async (err, data) => {
      if (err)
        console.log(err);
      req.session.contract = data;
      req.session.coinName = req.body.token_name;
      nodemailerservice.sendContractEmail(req.user.email, data);
      var clientdata = await client.find({
        where: {
          'email': req.user.email
        }
      });
      var objdata = new Object();
      objdata.contractCode = result;
      objdata.coinName = req.body.token_name;
      objdata.tokenSupply = req.body.token_supply;
      objdata.coinSymbol = req.body.token_symbol;
      objdata.hardCap = req.body.token_sale;
      objdata.ETHRate = req.body.eth_tokens;
      objdata.tokenContractCode = data;
      objdata.bonusRate = req.body.bonus_rate == '' ? 0 : req.body.bonus_rate;
      objdata.bonusStatus = req.body.bonus_rate == null ? true : false;
      console.log("here");
      var projectData = await ProjectConfiguration.create(objdata)
      await clientdata.addProjectConfiguration(projectData);
      clientdata.package1 -= 1;
      clientdata.save();
      res.redirect('/generatedContract');
    });
  },
  createERC223Contract: async (req, res) => {
    var Roles = await fileReader.readEjsFile(__dirname + '/ERC223contracts/Roles.sol');
    var ERC20 = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC20.sol');
    var ERC20Detailed = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC20Detailed.sol');
    var IERC20 = await fileReader.readEjsFile(__dirname + '/ERC223contracts/IERC20.sol');
    var ERC223_receiving_contract = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC223_receiving_contract.sol');
    var Ownable = await fileReader.readEjsFile(__dirname + '/ERC223contracts/Ownable.sol');
    var SafeERC20 = await fileReader.readEjsFile(__dirname + '/ERC223contracts/SafeERC20.sol');
    var SafeMath = await fileReader.readEjsFile(__dirname + '/ERC223contracts/SafeMath.sol');
    var SignerRole = await fileReader.readEjsFile(__dirname + '/ERC223contracts/SignerRole.sol');
    var isPausable = (req.body.isPausable == "on") ? true : false;
    var isBurnable = (req.body.isBurnable == "on") ? true : false;
    var isMintable = (req.body.isMintable == "on") ? true : false;
    var isUpgradeable = (req.body.isUpgradeable == "on") ? true : false;
    var ERC20CappedSign = "";
    inherits = "";

    if (isBurnable) {
      var ERC20Burnable = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC20Burnable.sol');
      inherits += ", ERC20Burnable";
    }
    if (isPausable) {
      var Pausable = await fileReader.readEjsFile(__dirname + '/ERC223contracts/Pausable.sol');
      var PauserRole = await fileReader.readEjsFile(__dirname + '/ERC223contracts/PauserRole.sol');
      var ERC20Pausable = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC20Pausable.sol');
      inherits += " , ERC20Pausable";
    }
    if (isMintable) {
      var MinterRole = await fileReader.readEjsFile(__dirname + '/ERC223contracts/MinterRole.sol');
      var ERC20Capped = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC20Capped.sol');
      var ERC20Mintable = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC20Mintable.sol');
      var CapperRole = await fileReader.readEjsFile(__dirname + '/ERC223contracts/CapperRole.sol');
      var ERC20Capped = await fileReader.readEjsFile(__dirname + '/ERC223contracts/ERC20Capped.sol');

      ERC20CappedSign = "ERC20Capped(" + req.body.token_supply * 10 + "000000000000000000)"
      inherits += ", ERC20Mintable,ERC20Capped";
    }
    if (isUpgradeable) {
      var Upgradable = await fileReader.readEjsFile(__dirname + '/ERC223contracts/Upgradable.sol');
      inherits += " , Upgradeable";
    }
    ejs.renderFile(__dirname + '/ERC223contracts/Coin.sol', {
      "SafeERC20": SafeERC20,
      "SafeMath": SafeMath,
      "IERC20": IERC20,
      "ERC20": ERC20,
      "ERC20Capped": ERC20Capped,
      "ERC20Detailed": ERC20Detailed,
      "MinterRole": MinterRole,
      "Ownable": Ownable,
      "Pausable": Pausable,
      "PauserRole": PauserRole,
      "Roles": Roles,
      "CapperRole": CapperRole,
      "SignerRole": SignerRole,
      "ERC20Burnable": ERC20Burnable,
      "ERC20Pausable": ERC20Pausable,
      "Upgradable": Upgradable,
      "ERC20Mintable": ERC20Mintable,
      "ERC223_receiving_contract": ERC223_receiving_contract,
      //data from form
      totalSupply: req.body.token_supply,
      name: req.body.token_name,
      symbol: req.body.token_symbol,
      decimal: req.body.token_decimals,
      decimalInZero: "000000000000000000",
      ERC20CappedSign: ERC20CappedSign
    }, async (err, data) => {
      if (err)
        console.log(err);
      req.session.contract = data;
      req.session.coinName = req.body.token_name;
      nodemailerservice.sendContractEmail(req.user.email, data);
      var clientdata = await client.find({
        where: {
          'email': req.user.email
        }
      });
      var objdata = new Object();
      objdata.contractCode = result;
      objdata.coinName = req.body.token_name;
      objdata.tokenSupply = req.body.token_supply;
      objdata.coinSymbol = req.body.token_symbol;
      objdata.hardCap = req.body.token_sale;
      objdata.ETHRate = req.body.eth_tokens;
      objdata.tokenContractCode = data;
      objdata.bonusRate = req.body.bonus_rate == '' ? 0 : req.body.bonus_rate;
      objdata.bonusStatus = req.body.bonus_rate == null ? true : false;
      var projectData = await ProjectConfiguration.create(objdata)
      await clientdata.addProjectConfiguration(projectData);
      clientdata.package1 -= 1;
      clientdata.save();
      res.redirect('/generatedContract');
    });
  },
  createERC721Contract: async (req, res) => {
    var SafeMath = await fileReader.readEjsFile(__dirname + '/ERC721contracts/SafeMath.sol');
    var Roles = await fileReader.readEjsFile(__dirname + '/ERC721contracts/Roles.sol');
    var ERC721Holder = await fileReader.readEjsFile(__dirname + '/ERC721contracts/ERC721Holder.sol');
    var Address = await fileReader.readEjsFile(__dirname + '/ERC721contracts/Address.sol');
    var ERC165 = await fileReader.readEjsFile(__dirname + '/ERC721contracts/ERC165.sol');
    var ERC721Mintable = await fileReader.readEjsFile(__dirname + '/ERC721contracts/ERC721Mintable.sol');
    var ERC721Enumerable = await fileReader.readEjsFile(__dirname + '/ERC721contracts/ERC721Enumerable.sol');
    var ERC721Metadata = await fileReader.readEjsFile(__dirname + '/ERC721contracts/ERC721Metadata.sol');
    var isPausable = (req.body.isPausable == "on") ? true : false;
    var isBurnable = (req.body.isBurnable == "on") ? true : false;
    var isOwnable = (req.body.isOwnable == "on") ? true : false;
    var ERC721Burnable, ERC721Pausable, Ownable, inherits = "";

    if (isBurnable) {
      ERC721Burnable = await fileReader.readEjsFile(__dirname + '/ERC721contracts/ERC721Burnable.sol');
      inherits += ", Burnable";
    }

    if (isPausable) {
      ERC721Pausable = await fileReader.readEjsFile(__dirname + '/ERC721contracts/ERC721Pausable.sol');
      inherits += ", Pausable";
    }
    if (isOwnable) {
      Ownable = await fileReader.readEjsFile(__dirname + '/ERC721contracts/Ownable.sol');
      inherits += ", Ownable";
    }
    ejs.renderFile(__dirname + '/ERC721contracts/Coin.sol', {
      'SafeMath': SafeMath,
      'Roles': Roles,
      'ERC721Holder': ERC721Holder,
      'Address': Address,
      'ERC165': ERC165,
      'ERC721Enumerable': ERC721Enumerable,
      'ERC721Metadata': ERC721Metadata,
      'ERC721Burnable': ERC721Burnable,
      'ERC721Mintable': ERC721Mintable,
      'ERC721Pausable': ERC721Pausable,
      'Ownable': Ownable,
      'tokenName': req.body.token_name,
      'tokenSymbol': req.body.token_symbol,
      'inherits': inherits
    }, (err, data) => {
      if (err)
        console.log(err);
      req.session.contract = data;
      req.session.coinName = req.body.token_name;
      nodemailerservice.sendContractEmail(req.user.email, result);
      res.redirect('/generatedContract');
    });
  },

  getGeneratedContract: async function (req, res) {
    var projectArray = await getProjectArray(req.user.email);
    var address = req.cookies['address'];
    console.log(req.session.coinName);
    res.render('deployedContract', {
      message1: "This is your token contract and this will hold all your tokens. Please do not close this tab.",
      user: req.user,
      address: address,
      ProjectConfiguration: projectArray,
      contract: req.session.contract,
      coinName: req.session.coinName
    });
  },
}

function getProjectArray(email) {
  var projectArray = [];
  return new Promise(async function (resolve, reject) {
    client.find({
      where: {
        'email': email
      },
      include: [{
        model: ProjectConfiguration,
        attributes: ['coinName', 'tokenContractAddress', 'tokenContractHash', 'crowdsaleContractCode']
      }],
    }).then(client => {
      client.projectConfigurations.forEach(element => {
        projectArray.push(element.dataValues);
      });
      // res.send({'projectArray': projectArray});
      resolve(projectArray);
    });
  });
}
