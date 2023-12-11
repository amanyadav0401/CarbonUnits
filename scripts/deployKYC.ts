import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import {
  expandTo18Decimals,
  expandTo6Decimals,
} from "../test/utilities/utilities";
import {CarbonExchange,ZeroCarbonCredit,ZeroCarbonUnitToken,IdentityFactory, IdentityRegistry, Identity, ClaimTopicsRegistry, TrustedIssuersRegistry,IdentityRegistryStorage} from "../typechain-types";

function sleep(ms: any) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

async function main() {
    const idfactory = await ethers.getContractFactory("IdentityFactory");
    const identity = await ethers.getContractFactory("Identity");
    const identityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
    const claimsTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
    const trustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
    

    const IdentityFactorys = await idfactory.deploy();
    await sleep(2000);
    const Identitys = await identity.deploy();
    await sleep(2000);
    const IdentityRegistrys = await identityRegistry.deploy();
    await sleep(2000);
    const IDStorage = await identityRegistryStorage.deploy();
    await sleep(2000);
    const Claims = await claimsTopicsRegistry.deploy();
    await sleep(2000);
    const Trust = await trustedIssuersRegistry.deploy();


    console.log("IDFactory Address- "+IdentityFactorys.address);
    console.log("Identity Address- "+Identitys.address);
    console.log("Registry Address- "+IdentityRegistrys.address);
    console.log("IDStorage Address- "+IDStorage.address);
    console.log("Claims Address- "+Claims.address);
    console.log("Trust Address- "+Trust.address);


}  

main()
.then(()=>process.exit(0))
.catch((error)=>{
    console.error(error);
    process.exit(1);
}) ;

// IDFactory Address- 0x4263eF23F1D2d2DE562557fa7e8974caaEE4E1B0
// Identity Address- 0xfe32b102e5c9D25E52cF868B6ed55091A349f0e0
// Registry Address- 0x8B4C52eeA3ECc1E4875E6966F6c22C5c3474d4e0
// IDStorage Address- 0xD31c7ad1e30088c6f366B6287020C232E8675E8B
// Claims Address- 0xC0E545e6D99D185c6e08CddBB57636eedd4fEd29
// Trust Address- 0x766868d9b2dfA8672458dF1cc5b63669a057636c