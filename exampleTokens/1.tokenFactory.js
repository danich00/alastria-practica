const { tokensFactory } = require('alastria-identity-lib')
const { tests } = require('alastria-identity-JSON-objects/tests')
const Web3 = require('web3')
const fs = require('fs')
const keythereum = require('keythereum')

const rawdata = fs.readFileSync('../configuration.json')
const config = JSON.parse(rawdata)

// Data
const tokenPayload = config.tokenPayload
// End data

const keyDataFirstIdentity = fs.readFileSync(
  '../keystores/sp.json'
)
const keystoreDataFirstIdentity = JSON.parse(keyDataFirstIdentity)

const firstIdentityKeyStore = keystoreDataFirstIdentity

let spPrK
try {
  spPrK = keythereum.recover(config.addressPassword, firstIdentityKeyStore)
} catch (error) {
  console.error('ERROR: ', error)
  process.exit(1)
}

console.log('---- signJWT ----')

const signedJWT = tokensFactory.tokens.signJWT(tokenPayload, spPrK)
console.log('\tThe signed JWT is: ', signedJWT)
tests.tokens.validateToken(signedJWT)

console.log('\n---- decodeJWT ----')

const decodedJWT = tokensFactory.tokens.decodeJWT(signedJWT)
console.log('\tThe decoded token is: \n', decodedJWT)

console.log('\n---- verifyJWT ----')

// '04' means uncompressed key (more info at https://github.com/indutny/elliptic/issues/138)
const verifyJWT = tokensFactory.tokens.verifyJWT(
  signedJWT,
  '04' + config.firstIdentityPubk.substr(2)
)
console.log('\tIs the signedJWT verified?', verifyJWT)

// Data
const context = config.context
const type = config.type
const didIsssuer = config.didEntity3
const providerURL = config.providerURL
const callbackURL = config.callbackURL
const alastriaNetId = config.networkId
const tokenExpTime = config.tokenExpTime
const tokenActivationDate = config.tokenActivationDate
const tokenNotBefore = config.tokenNotBefore
const jsonTokenId = config.jsonTokenId
const kidCredential = config.kidCredential
// End data

console.log('\n---- createAlastriaToken ----')

const alastriaToken = tokensFactory.tokens.createAlastriaToken(
  didIsssuer,
  providerURL,
  callbackURL,
  alastriaNetId,
  tokenExpTime,
  kidCredential,
  config.firstIdentityPubk,
  tokenActivationDate,
  jsonTokenId
)
console.log('\tThe Alastria token is: \n', alastriaToken)

// Signing the AlastriaToken
const signedAT = tokensFactory.tokens.signJWT(alastriaToken, spPrK)
tests.tokens.validateToken(signedAT)

console.log('\n---- createAlastriaSession ----')

const alastriaSession = tokensFactory.tokens.createAlastriaSession(
  context,
  didIsssuer,
  config.kidCredential,
  type,
  signedAT,
  tokenExpTime,
  config.firstIdentityPubk,
  tokenActivationDate,
  jsonTokenId
)
console.log('\tThe Alastria session is:\n', alastriaSession)

// Data
const jti = config.jti
const subjectAlastriaID = config.subjectAlastriaID
const credentialSubject = {}
const credentialKey = config.credentialKey
const credentialValue = config.credentialValue
credentialSubject[credentialKey] = credentialValue
credentialSubject.levelOfAssurance = 'basic'
// End data

console.log('\n---- createCredential ----')

const credential1 = tokensFactory.tokens.createCredential(
  config.didEntity1,
  context,
  credentialSubject,
  kidCredential,
  subjectAlastriaID,
  tokenExpTime,
  tokenActivationDate,
  jti
)
console.log('\nThe credential1 is: ', credential1)

console.log('\n---- PSMHash ----')

// Init your blockchain provider
const myBlockchainServiceIp = config.nodeUrl

const web3 = new Web3(new Web3.providers.HttpProvider(myBlockchainServiceIp))

const psmHashSubject = tokensFactory.tokens.PSMHash(
  web3,
  signedJWT,
  config.didSubject1
)
console.log('\tThe PSMHash is:', psmHashSubject)

const psmHashReciever = tokensFactory.tokens.PSMHash(
  web3,
  signedJWT,
  config.didEntity2
)
console.log('\tThe PSMHashReciever is:', psmHashReciever)

console.log('\n---- Create AIC ----')
// create AIC

// Only the createAlastriaID transaction must be signed inside of AIC object
const aic = tokensFactory.tokens.createAIC(
  context,
  type,
  config.signedTxCreateAlastriaID,
  signedAT,
  config.firstIdentityPubk,
  kidCredential,
  config.firstIdentityPubk,
  jti,
  tokenActivationDate,
  tokenExpTime,
  tokenNotBefore
)
console.log('\tAIC:', aic)

const signedJWTAIC = tokensFactory.tokens.signJWT(aic, spPrK)
console.log('AIC Signed:', signedJWTAIC)
tests.alastriaIdCreations.validateAlastriaIdCreation(signedJWTAIC)

// Data
const procUrl = config.procUrl
const procHash = config.procHash
const data = config.data
// End data

console.log('\n---- createPresentationRequest ----')

const presentationRequest = tokensFactory.tokens.createPresentationRequest(
  config.didsp,
  context,
  procUrl,
  procHash,
  data,
  callbackURL,
  type,
  kidCredential,
  config.spPK,
  tokenExpTime,
  tokenActivationDate,
  jti
)

const signedPresentationRequest = tokensFactory.tokens.signJWT(
  presentationRequest,
  spPrK
)
console.log('\nThe presentationRequest is: ', signedPresentationRequest)
tests.presentationRequests.validatePresentationRequest(
  signedPresentationRequest
)

const presentation = tokensFactory.tokens.createPresentation(
  didIsssuer,
  didIsssuer,
  context,
  tokensFactory.tokens.signJWT(presentationRequest, spPrK),
  procUrl,
  procHash,
  type,
  kidCredential,
  config.firstIdentityPubk,
  tokenExpTime,
  tokenActivationDate,
  jti
)
const signedPresentation = tokensFactory.tokens.signJWT(
  presentation,
  spPrK
)
console.log('\nThe presentation is: ', signedPresentation)
tests.presentations.validatePresentation(signedPresentation)
