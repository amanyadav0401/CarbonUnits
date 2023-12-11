import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import {
  expandTo18Decimals,
  expandTo6Decimals,
} from "../test/utilities/utilities";
import {CarbonExchange,ZeroCarbonCredit,ZeroCarbonUnitToken,OwnedUpgradeabilityProxy} from "../typechain-types";

function sleep(ms: any) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

async function main() {
    // const proxy = await ethers.getContractFactory("OwnedUpgradeabilityProxy");
    const exchange = await ethers.getContractFactory("CarbonExchange");
    const nft = await ethers.getContractFactory("ZeroCarbonCredit");
    const token = await ethers.getContractFactory("ZeroCarbonUnitToken");
    

    const Exchange = await exchange.deploy();
    await sleep(2000);
    const NFT = await nft.deploy();
    await sleep(2000);
    const Token = await token.deploy();
    await sleep(2000);
    // const Proxy_Exchange = await proxy.deploy();
    // await sleep(2000);
    // const Proxy_NFT = await proxy.deploy();
    // await sleep(2000);
    // const Proxy_Token = await proxy.deploy();
    // await sleep(2000);


    console.log("Exchange Address- "+Exchange.address);
    console.log("NFT Address- "+NFT.address);
    console.log("Token Address- "+Token.address);
    // console.log("Exchange Proxy- "+Proxy_Exchange.address);
    // console.log("NFT Proxy- "+Proxy_NFT.address);
    // console.log("Token Proxy- "+Proxy_Token.address);


}  

main()
.then(()=>process.exit(0))
.catch((error)=>{
    console.error(error);
    process.exit(1);
}) ;


// Exchange Address- 0x1f9Abd7c4c8B21c3c1BA09a1aD8e2Fb312Cbc55B
// NFT Address- 0x2f83F3660D0D725b210A73710f7c3af316c6A230
// Token Address- 0x0F191bBc1854Bab6e52e3AfD49c64FE8b7a03410
// Exchange Proxy- 0x419a129851F7B3659DCd7667F3AE931f0261AD4F
// NFT Proxy- 0x3832F99f45979cEDF67603CB4235253E4664C3C3
// Token Proxy- 0x6b27069b128b5Cb3961721767c1B0dC661B776F7

// Exchange Address- 0xAaB08C2Ac1F52D3BAbAA3463F4646E2E94093477
// NFT Address- 0x531D30F4A3E22D804ae4842C6d1EF1430b49e208
// Token Address- 0xF7534AA630f7C49568EF3cbF174d204Df0f68173