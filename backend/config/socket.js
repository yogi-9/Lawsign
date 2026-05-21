'use strict';

/**
 * config/socket.js
 * Holds the Socket.io instance so controllers can emit events
 * without creating a circular dependency with server.js.
 *
 * Usage:
 *   - server.js calls setIO(io) after creating the Socket.io server
 *   - output.controller.js calls getIO().to(room).emit(...)
 */

let _io = null;

/**
 * Store the Socket.io instance (called once in server.js at startup).
 * @param {import('socket.io').Server} io
 */
const setIO = (io) => {
  _io = io;
};

/**
 * Retrieve the Socket.io instance.
 * Throws if called before server.js has called setIO().
 * @returns {import('socket.io').Server}
 */
const getIO = () => {
  if (!_io) throw new Error('Socket.io has not been initialized. Call setIO(io) in server.js first.');
  return _io;
};

module.exports = { setIO, getIO };
