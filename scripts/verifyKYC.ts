const Hre = require("hardhat");

async function main() {


    await Hre.run("verify:verify", {
      //Deployed contract Factory address
      address: "0x4263eF23F1D2d2DE562557fa7e8974caaEE4E1B0",
      //Path of your main contract.
      contract: "contracts/KYC Module/IdentityFactory.sol:IdentityFactory",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Factory address
      address: "0xfe32b102e5c9D25E52cF868B6ed55091A349f0e0",
      //Path of your main contract.
      contract: "contracts/KYC Module/Identity.sol:Identity",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Marketplace address
      address: "0x8B4C52eeA3ECc1E4875E6966F6c22C5c3474d4e0",
      //Path of your main contract.
      contract: "contracts/KYC Module/registry/IdentityRegistry.sol:IdentityRegistry",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Marketplace address
      address: "0xD31c7ad1e30088c6f366B6287020C232E8675E8B",
      //Path of your main contract.
      contract: "contracts/KYC Module/registry/IdentityRegistryStorage.sol:IdentityRegistryStorage",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Marketplace address
      address: "0xC0E545e6D99D185c6e08CddBB57636eedd4fEd29",
      //Path of your main contract.
      contract: "contracts/KYC Module/registry/ClaimTopicsRegistry.sol:ClaimTopicsRegistry",
    });

    await Hre.run("verify:verify",{
      //Deployed contract MarketPlace proxy
      address: "0x766868d9b2dfA8672458dF1cc5b63669a057636c",
      //Path of your main contract.
      contract: "contracts/KYC Module/registry/TrustedIssuersRegistry.sol:TrustedIssuersRegistry"
    });


}
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});