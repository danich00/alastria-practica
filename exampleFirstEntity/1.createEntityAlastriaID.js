const {
  transactionFactory,
  UserIdentity,
  config,
  tokensFactory
} = require('alastria-identity-lib')
const fs = require('fs')
const Web3 = require('web3')
const keythereum = require('keythereum')

const rawdata = fs.readFileSync('../configuration.json')
const configData = JSON.parse(rawdata)

const keyDataEntity1 = fs.readFileSync(
  '../keystores/sp.json'
)
const keystoreDataEntity1 = JSON.parse(keyDataEntity1)
const keyDataFirstIdentity = fs.readFileSync(
  '../keystores/firstIdentity-643266eb3105f4bf8b4f4fec50886e453f0da9ad.json'
)
const keystoreDataFirstIdentity = JSON.parse(keyDataFirstIdentity)

// Init your blockchain provider
const myBlockchainServiceIp = configData.nodeURL
const web3 = new Web3(new Web3.providers.HttpProvider(myBlockchainServiceIp))

console.log(
  '\n ------ Example of prepare Alastria ID, addKey and createAlastrisID necessary to have an Alastria ID ------ \n'
)
// Data

const firstIdentityKeyStore = keystoreDataFirstIdentity

let firstIdentityPrivateKey
try {
  firstIdentityPrivateKey = keythereum.recover(
    configData.addressPassword,
    firstIdentityKeyStore
  )
} catch (error) {
  console.error('ERROR: ', error)
  process.exit(1)
}

const firstIdentityIdentity = new UserIdentity(
  web3,
  `0x${firstIdentityKeyStore.address}`,
  firstIdentityPrivateKey
)

const entity1Keystore = keystoreDataEntity1

let entity1PrivateKey
try {
  entity1PrivateKey = keythereum.recover(
    configData.addressPassword,
    entity1Keystore
  )
} catch (error) {
  console.error('ERROR: ', error)
  process.exit(1)
}

const entity1Identity = new UserIdentity(
  web3,
  `0x${entity1Keystore.address}`,
  entity1PrivateKey
)
// End data

function preparedAlastriaId() {
  const preparedId = transactionFactory.identityManager.prepareAlastriaID(
    web3,
    `0x${entity1Keystore.address}`
  )
  return preparedId
}

function createAlastriaId() {
  const txCreateAlastriaID = transactionFactory.identityManager.createAlastriaIdentity(
    web3,
    configData.spPK.substr(2)
  )
  return txCreateAlastriaID
}

console.log(
  '\n ------ A promise all where prepareAlastriaID and createAlsatriaID transactions are signed and sent ------ \n'
)
async function main() {
  const prepareResult = await preparedAlastriaId()
  const createResult = await createAlastriaId()

  const signedPreparedTransaction = await firstIdentityIdentity.getKnownTransaction(
    prepareResult
  )
  const signedCreateTransaction = await entity1Identity.getKnownTransaction(
    createResult
  )
  web3.eth
    .sendSignedTransaction(signedPreparedTransaction)
    .on('transactionHash', function (hash) {
      console.log('HASH: ', hash)
    })
    .on('receipt', function (receipt) {
      console.log('RECEIPT: ', receipt)
      web3.eth
        .sendSignedTransaction(signedCreateTransaction)
        .on('transactionHash', function (hash) {
          console.log('HASH: ', hash)
        })
        .on('receipt', function (receipt) {
          console.log('RECEIPT: ', receipt)
          web3.eth
            .call({
              to: config.alastriaIdentityManager,
              data: web3.eth.abi.encodeFunctionCall(
                config.contractsAbi.AlastriaIdentityManager.identityKeys,
                [`0x${entity1Keystore.address}`]
              )
            })
            .then((AlastriaIdentity) => {
              console.log(
                `alastriaProxyAddress: 0x${AlastriaIdentity.slice(26)}`
              )
              configData.sp = `0x${AlastriaIdentity.slice(26)}`
              fs.writeFileSync(
                '../configuration.json',
                JSON.stringify(configData)
              )
              const alastriaDID = tokensFactory.tokens.createDID(
                configData.network,
                AlastriaIdentity.slice(26),
                configData.networkId
              )
              configData.didsp = alastriaDID
              fs.writeFileSync(
                '../configuration.json',
                JSON.stringify(configData)
              )
              console.log('the alastria DID is:', alastriaDID)
            })
        })

        .on('error', function (error) {
          console.error(error)
          process.exit(1)
        }) // If a out of gas error, the second parameter is the receipt.
    })

    .on('error', function (error) {
      console.error(error)
      process.exit(1)
    }) // If a out of gas error, the second parameter is the receipt.
}

main()
