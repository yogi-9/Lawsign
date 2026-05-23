'use strict';

/**
 * models/index.js
 * Centralized barrel export for all Mongoose models.
 * Import from here: const { User, Document, Signature, AuditLog } = require('../models');
 */

module.exports = {
  User: require('./User'),
  Document: require('./Document'),
  Signature: require('./Signature'),
  AuditLog: require('./AuditLog'),
};
