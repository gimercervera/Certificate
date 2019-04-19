// Allows us to use ES6 in our migrations and tests.
//require('babel-register')

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*' // Match any network id
    }
  },
  compilers: {
    solc: {
      version: "0.4.15"  // ex:  "0.4.20". (Default: Truffle's installed solc)
    }
 }
}
