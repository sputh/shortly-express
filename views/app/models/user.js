var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,


  initialize: function(){
    this.on('creating', function(model){
      // var salt = bcrypt.genSaltSync(10); // Sync = :(
      var hash = bcrypt.hashSync(model.get('password')); // Sync = :(
      model.set('password', hash);
    });
  }
});


module.exports = User;
