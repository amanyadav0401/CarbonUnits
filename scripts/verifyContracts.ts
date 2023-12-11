const Hre = require("hardhat");

async function main() {


    await Hre.run("verify:verify", {
      //Deployed contract Factory address
      address: "0xAaB08C2Ac1F52D3BAbAA3463F4646E2E94093477",
      //Path of your main contract.
      contract: "contracts/CarbonExchange.sol:CarbonExchange",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Factory address
      address: "0x531D30F4A3E22D804ae4842C6d1EF1430b49e208",
      //Path of your main contract.
      contract: "contracts/CarbonCredit.sol:ZeroCarbonCredit",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Marketplace address
      address: "0xF7534AA630f7C49568EF3cbF174d204Df0f68173",
      //Path of your main contract.
      contract: "contracts/CarbonUnits.sol:ZeroCarbonUnitToken",
    });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Marketplace address
    //   address: "0x419a129851F7B3659DCd7667F3AE931f0261AD4F",
    //   //Path of your main contract.
    //   contract: "contracts/Proxy/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Marketplace address
    //   address: "0x3832F99f45979cEDF67603CB4235253E4664C3C3",
    //   //Path of your main contract.
    //   contract: "contracts/Proxy/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy",
    // });

    // await Hre.run("verify:verify",{
    //   //Deployed contract MarketPlace proxy
    //   address: "0x6b27069b128b5Cb3961721767c1B0dC661B776F7",
    //   //Path of your main contract.
    //   contract: "contracts/Proxy/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy"
    // });


}
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});