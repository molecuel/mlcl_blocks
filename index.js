var async = require('async');
var molecuel;

var blocks = function() {
  var self = this;

  // Registry for blocks type handler
  this.typeHandlerRegistry = {};

  molecuel.on('mlcl::core::init:post', function(mlcl) {
    molecuel.emit('mlcl::blocks::init:modules', self);
  });
}


/**
 * Register a handler for a block type
 * @param type
 * @param handler
 */
blocks.prototype.registerTypeHandler = function registerTypeHandler(type, handler) {
  if(!this.typeHandlerRegistry[type]) {
    this.typeHandlerRegistry[type] = [];
  }
  this.typeHandlerRegistry[type].push(handler);
};

/**
 * Express middleware
 */
blocks.prototype.get = function get(req, res, next) {
  var self = this;
  if(!res.locals.data) {
    next();
  } else {
    res.locals.blocks = [];
    async.each(Object.keys(res.locals.data), function(key, cb) {
      var data = res.locals.data[key] || {};
      var blocks = data.blocks || [];
      async.each(blocks, function(block, cb) {
        self.block(req, res, block, function(err, block) {
          if(err) {
            return cb(err);
          }
          res.locals.blocks.push(block);
          cb();
        });
      }, function(err) {
        cb(err);
      });
    }, function(err) {
      if(err) {
        return res.send(500, err);
      }
      next();
    });
  }
};

blocks.prototype.block = function block(req, res, block, callback) {
  var self = this;
  var type = block.type || '';
  if(this.typeHandlerRegistry[type]) {
    async.each(this.typeHandlerRegistry[type], function(handler, cb) {
      handler.apply(self, [req, res, block, function(err, result) {
        if(result) {
          block.result = result;
        }
        cb(err);
      }]);
    }, function(err) {
      callback(err, block);
    });
  } else {
    callback(null, block);
  }
};

/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
var instance = null;

var getInstance = function(){
  return instance || (instance = new blocks());
};

var init = function (m) {
  // store molecuel instance
  molecuel = m;
  return getInstance();
};

module.exports = init;
