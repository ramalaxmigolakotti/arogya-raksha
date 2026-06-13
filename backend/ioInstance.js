/**
 * ioInstance.js
 * Singleton holder for the Socket.io server instance.
 * Breaks the circular dependency between server.js → routes/crisis.js → server.js
 * 
 * Usage:
 *   In server.js after creating io:  require('./ioInstance').setIo(io)
 *   In any route:                    require('./ioInstance').getIo()
 */

let _io = null;

function setIo(io) {
  _io = io;
}

function getIo() {
  return _io;
}

module.exports = { setIo, getIo };
