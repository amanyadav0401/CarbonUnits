import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers } from "hardhat";
import { CarbonExchange,
     CarbonExchange__factory,
      ClaimTopicsRegistry,
      ClaimTopicsRegistry__factory,
      Identity,
      IdentityFactory,
      IdentityFactory__factory,
      IdentityRegistry,
      IdentityRegistryStorage,
      IdentityRegistryStorage__factory,
      IdentityRegistry__factory,
      Identity__factory,
      TrustedIssuersRegistry,
      TrustedIssuersRegistry__factory,
      USDT, USDT__factory,
       ZeroCarbonCredit, 
       ZeroCarbonCredit__factory,
        ZeroCarbonUnitToken,
         ZeroCarbonUnitToken__factory } from "../typechain-types";
import { expandTo18Decimals, 
    expandTo6Decimals } from "./utilities/utilities";
import { expect } from "chai";
import CarbonCreditParcel from "./utilities/parcel";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Zero Carbon Platform Test Cases",()=>{

    let owner: SignerWithAddress;
    let signer: SignerWithAddress[];
    let exchange : CarbonExchange;
    let nft : ZeroCarbonCredit;
    let token: ZeroCarbonUnitToken;
    let usdt : USDT;
    let id : Identity;
    let idFactory : IdentityFactory;
    let registry : IdentityRegistry;
    let registryStorage : IdentityRegistryStorage;
    let trustedIssuerRegistry : TrustedIssuersRegistry;
    let claimTopicsRegistry : ClaimTopicsRegistry;

    let address1 = "0x0000000000000000000000000000000000000001";
    let address0 = "0x0000000000000000000000000000000000000000"


    beforeEach(async()=>{
        signer = await ethers.getSigners();
        owner = signer[0];
        exchange = await new CarbonExchange__factory(owner).deploy();
        nft = await new ZeroCarbonCredit__factory(owner).deploy();
        token = await new ZeroCarbonUnitToken__factory(owner).deploy();
        usdt = await new USDT__factory(owner).deploy();
        idFactory = await new IdentityFactory__factory(owner).deploy();
        id = await new Identity__factory(owner).deploy();
        registry = await new IdentityRegistry__factory(owner).deploy();
        registryStorage = await new IdentityRegistryStorage__factory(owner).deploy();
        trustedIssuerRegistry = await new TrustedIssuersRegistry__factory(owner).deploy();
        claimTopicsRegistry = await new ClaimTopicsRegistry__factory(owner).deploy();
        await expect(exchange.connect(owner).initialize(address0,200,usdt.address,nft.address,idFactory.address)).to.be.revertedWith("Zero address for Admin");
        await expect(exchange.connect(owner).initialize(owner.address,200,address0,nft.address,idFactory.address)).to.be.revertedWith("Zero address for tether");
        await expect(nft.connect(owner).initialize("Zero Carbon NFT","ZCC",address0,exchange.address,token.address)).to.be.revertedWith("ZAA");
        await expect(nft.connect(owner).initialize("Zero Carbon NFT","ZCC",owner.address,address0,token.address)).to.be.revertedWith("ZAM");
        await expect(nft.connect(owner).initialize("Zero Carbon NFT","ZCC",owner.address,exchange.address,address0)).to.be.revertedWith("ZAT");
        await exchange.connect(owner).initialize(owner.address,200,usdt.address,nft.address,idFactory.address);
        await nft.connect(owner).initialize("Zero Carbon NFT","ZCC",owner.address,exchange.address,token.address);
        await token.connect(owner).init("ZeroCarbon Token","ZCU",0,nft.address,registry.address,owner.address);
        await idFactory.connect(owner).init(id.address,registry.address,owner.address);
        await registry.connect(owner).init(trustedIssuerRegistry.address,claimTopicsRegistry.address,registryStorage.address);
        await registryStorage.connect(owner).init();
        await registryStorage.connect(owner).bindIdentityRegistry(registry.address);
        await registry.connect(owner).addAgent(idFactory.address);
    })

    it("Testing parcel signing and listing.", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer: owner
        })

        const parcel = await seller.createParcel(
            owner.address,
            1,
            20,
            200,
            23455667,
            "Sample Carbon Credit URI"
        )

      expect(await exchange.verifyParcel(parcel)).to.be.eq(owner.address)

    })

    it("Setting platform fee.", async() =>{
        await exchange.connect(owner).updatePlatformFeePercent(300);
        expect(await exchange.platformFeePercent()).to.be.eq(300);
    })

    it("Calculate total amount to be paid.", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer: owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            100,
            10000000,
            1999202002,
            "Carbon credits"
        )

        expect(await exchange.calculateTotalAmount(parcel,10)).to.be.eq(102000000)
    })

    it("Setting new admin.", async()=>{
        console.log("Current admin: ", await exchange.admin());
        await exchange.connect(owner).updateAdmin(signer[1].address);
        expect(await exchange.admin()).to.be.eq(signer[1].address);
    })


    it("Buy carbon credits for the first time from eth", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            100,
            1788309246,
            "Sample"
        );
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});
        expect(await token.balanceOf(signer[1].address)).to.be.eq(10);
        expect(await nft.maxSupplyPerCreditNFT(1)).to.be.eq(15);
        expect( await nft.currentSupplyPerCreditNFT(1)).to.be.eq(10);
    })

    it("Buy carbon credits for the first time from USDT", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            expandTo6Decimals(10),
            1788309246,
            "Sample"
        );
        await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
        await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(102))
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,usdt.address,1);
        expect(await token.balanceOf(signer[1].address)).to.be.eq(10);
        expect(await nft.maxSupplyPerCreditNFT(1)).to.be.eq(15);
        expect( await nft.currentSupplyPerCreditNFT(1)).to.be.eq(10);
    })


    it("Buy carbon credits for the second time from eth", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            100,
            1788309246,
            "Sample"
        );
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});
        expect(await token.balanceOf(signer[1].address)).to.be.eq(10);
        expect(await nft.maxSupplyPerCreditNFT(1)).to.be.eq(15);
        expect( await nft.currentSupplyPerCreditNFT(1)).to.be.eq(10);
        const seller2 = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : signer[1]
        })

        const parcel2 = await seller2.createParcel(
            signer[1].address,
            1,
            5,
            50,
            1788309246,
            "Test_URI"
        )
        await token.connect(signer[1]).approve(exchange.address,1);
        await exchange.connect(signer[2]).buyNFT(parcel2, 3,false,address1,1,{value: 155});
        expect(await token.balanceOf(signer[2].address)).to.be.eq(3);
        expect(await nft.maxSupplyPerCreditNFT(1)).to.be.eq(15);
        expect( await nft.currentSupplyPerCreditNFT(1)).to.be.eq(10);
    })


    it("Buy carbon credits for the second time from usdt", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            expandTo6Decimals(10),
            1788309246,
            "Sample"
        );
        await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
        await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(102))
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,usdt.address,1);
        const seller2 = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : signer[1]
        })

        const parcel2 = await seller2.createParcel(
            signer[1].address,
            1,
            5,
            expandTo6Decimals(20),
            1788309246,
            "Test_URI"
        )
        await usdt.connect(owner).mint(signer[2].address, expandTo6Decimals(1000));
        await usdt.connect(signer[2]).approve(exchange.address,expandTo6Decimals(62))
        await token.connect(signer[1]).approve(exchange.address,1);
        await exchange.connect(signer[2]).buyNFT(parcel2,3,false,usdt.address,1);
        expect(await token.balanceOf(signer[2].address)).to.be.eq(3);
        expect(await nft.maxSupplyPerCreditNFT(1)).to.be.eq(15);
        expect( await nft.currentSupplyPerCreditNFT(1)).to.be.eq(10);
    })


    it("Sending carbon credits without listing.", async()=>{

        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            1000,
            100,
            1788309246,
            "Sample"
        );
        let addressReturned = await exchange.verifyParcel(parcel);
        console.log("Address owner: ", owner.address, "   Returned address: ", addressReturned);
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});
        console.log("Proof of sale: ", await token.balanceOf(signer[1].address));
        console.log(await registry.isVerified(signer[1].address));

        await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});
        console.log("Proof of second sale: ", await token.balanceOf(signer[1].address));
        console.log(await nft.currentSupplyPerCreditNFT(1));



        // await expect(token.connect(signer[1]).transfer(signer[2].address,2)).to.be.revertedWith("Prohibited function.")
    })
    it ("View sale receipt",async()=>{

        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            100,
            1788309246,
            "Sample"
        );
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});

        console.log(await exchange.viewSaleReceipt(signer[1].address,1));
    })

    it ("Withdrawing platform amount for ETH",async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            100,
            1788309246,
            "Sample"
        );
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});
        console.log("balance of Owner",await owner.getBalance());
        await exchange.connect(owner).withdrawPlatformAmount(address1);
        console.log("balance of Owner",await owner.getBalance());
    })

    it ("Withdrawing platform amount for usdt",async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            expandTo6Decimals(20),
            1788309246,
            "Sample"
        );
        await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
        await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(202))
        await exchange.connect(signer[1]).buyNFT(parcel,2,true,usdt.address,1);
        console.log("balance of Owner",await usdt.balanceOf(owner.address));
        await exchange.connect(owner).withdrawPlatformAmount(usdt.address);
        console.log("balance of Owner",await usdt.balanceOf(owner.address));
    })

    it ("Updating platform fee", async()=>{
        await exchange.connect(owner).updatePlatformFee(400);
        expect(await exchange.platformFeePercent()).to.be.eq(400);
    })

    it("Parcel owner test case", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            expandTo6Decimals(20),
            1788309246,
            "Sample"
        );

        expect(await exchange.parcelOwner(parcel)).to.be.eq(owner.address);
    })

    it("Buy carbon credits for the first time from eth", async()=>{
        const seller = await new CarbonCreditParcel({
            _contract: exchange,
            _signer : owner
        })
        const parcel = await seller.createParcel(
            owner.address,
            1,
            15,
            100,
            1788309246,
            "Sample"
        );
        await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:1020});
        expect(await token.balanceOf(signer[1].address)).to.be.eq(10);
        expect(await nft.maxSupplyPerCreditNFT(1)).to.be.eq(15);
        expect( await nft.currentSupplyPerCreditNFT(1)).to.be.eq(10);
        expect(await ethers.provider.getBalance(exchange.address)).to.be.eq(20)
    })

    describe("Negative test cases for exchange", async ()=>{
        it("invalid expiration time test case", async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                signer[1].address,
                1,
                15,
                100,
                12222,
                "Sample"
            );
            await expect(exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000})).to.be.revertedWith("Invalid Time period.");
        })
        it ("invalid signer test case", async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                signer[1].address,
                1,
                15,
                100,
                1788309246,
                "Sample"
            );
            await expect(exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000})).to.be.revertedWith("Invalid seller.");
        })

        it ("Invalid amount test case",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                100,
                1788309246,
                "Sample"
            );
            await expect(exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10})).to.be.revertedWith("Invalid amount.");
        })

        it ("Currency not allowed test case",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                expandTo6Decimals(10),
                1788309246,
                "Sample"
            );
            await expect(exchange.connect(signer[1]).buyNFT(parcel,10,true,signer[3].address,1)).to.be.revertedWith("Currency not allowed.");
        })

        it ("NFT does not exist test case",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                expandTo6Decimals(10),
                1788309246,
                "Sample"
            );
            await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
            await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(102))
            await exchange.connect(signer[1]).buyNFT(parcel,10,true,usdt.address,1);
            const seller2 = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : signer[1]
            })
    
            const parcel2 = await seller2.createParcel(
                signer[1].address,
                2,
                5,
                expandTo6Decimals(20),
                1788309246,
                "Test_URI"
            )
            await usdt.connect(owner).mint(signer[2].address, expandTo6Decimals(1000));
            await usdt.connect(signer[2]).approve(exchange.address,expandTo6Decimals(62))
            await token.connect(signer[1]).approve(exchange.address,1);
            await expect (exchange.connect(signer[2]).buyNFT(parcel2,3,false,usdt.address,1)).to.be.revertedWith("NFT does not exist.");
        
    
        })

        it ("Invalid amount test case for secondary buy",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                100,
                1788309246,
                "Sample"
            );
            await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});
            const seller2 = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : signer[1]
            })
    
            const parcel2 = await seller2.createParcel(
                signer[1].address,
                1,
                5,
                10,
                1788309246,
                "Test_URI"
            )
            await token.connect(signer[1]).approve(exchange.address,1);
            await expect (exchange.connect(signer[2]).buyNFT(parcel2,3,false,address1,1,{value:1})).to.be.revertedWith("Invalid amount.");
        
    
        })

        it ("Invalid currency test case for secondary buy",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                100,
                1788309246,
                "Sample"
            );
            await exchange.connect(signer[1]).buyNFT(parcel,10,true,address1,1,{value:10000});
            const seller2 = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : signer[1]
            })
    
            const parcel2 = await seller2.createParcel(
                signer[1].address,
                1,
                5,
                expandTo6Decimals(10),
                1788309246,
                "Test_URI"
            )
            await token.connect(signer[1]).approve(exchange.address,1);
            await usdt.connect(owner).mint(signer[2].address, expandTo6Decimals(1000));
            await usdt.connect(signer[2]).approve(exchange.address,expandTo6Decimals(62))
            await expect (exchange.connect(signer[2]).buyNFT(parcel2,3,false,signer[3].address,1)).to.be.revertedWith("Invalid currency");
        
    
        })

        it("Inavlid currency for withdrawing platform fee",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                expandTo6Decimals(20),
                1788309246,
                "Sample"
            );
            await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
            await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(202))
            await exchange.connect(signer[1]).buyNFT(parcel,2,true,usdt.address,1);
            await expect(exchange.connect(owner).withdrawPlatformAmount(signer[2].address)).to.be.revertedWith("Currency not allowed!");
            
        })

        it("Non-admin account calling only-admin functions",async()=>{
            await expect(exchange.connect(signer[1]).updatePlatformFeePercent(300)).to.be.revertedWith("You are not the admin.")
        })

    })

    describe("Negative Test cases for Carbon credit NFT",async()=>{
        it("Negative test cases for minting",async()=>{
            await expect(nft.connect(owner).MintNft(signer[1].address,1,"Test_URI",20,3,1788309246)).to.be.revertedWith("Call only allowed from Carbon Exchange");
        })
        it("Current supply greater than max supply",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                expandTo6Decimals(20),
                1788309246,
                "Sample"
            );
            await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
            await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(202))
            await usdt.connect(owner).mint(signer[2].address, expandTo6Decimals(1000));
            await usdt.connect(signer[2]).approve(exchange.address,expandTo6Decimals(290))
            await exchange.connect(signer[1]).buyNFT(parcel,2,true,usdt.address,1);
            await expect(exchange.connect(signer[2]).buyNFT(parcel,14,true,usdt.address,1)).to.be.revertedWith("Total Supply for Carbon units cannot exceed max supply.");
        })

        it("Updating token URI for a token",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                expandTo6Decimals(20),
                1788309246,
                "Sample"
            );
            await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
            await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(202))
            await exchange.connect(signer[1]).buyNFT(parcel,2,true,usdt.address,1);

            await nft.connect(owner).updateTokenURI(1,"Test_URI");
            expect(await nft.tokenURI(1)).to.be.eq("Test_URI");
        })

        it("Updating token URI for a token with a non-admin account",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                expandTo6Decimals(20),
                1788309246,
                "Sample"
            );
            await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
            await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(202))
            await exchange.connect(signer[1]).buyNFT(parcel,2,true,usdt.address,1);

            await expect(nft.connect(signer[1]).updateTokenURI(1,"Test_URI")).to.be.revertedWith("You are not the admin.");
            
        })

        it("Getting total supply of a token",async()=>{
            const seller = await new CarbonCreditParcel({
                _contract: exchange,
                _signer : owner
            })
            const parcel = await seller.createParcel(
                owner.address,
                1,
                15,
                expandTo6Decimals(20),
                1788309246,
                "Sample"
            );
            await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
            await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(202))
            await exchange.connect(signer[1]).buyNFT(parcel,2,true,usdt.address,1);

            expect(await nft._totalSupply()).to.be.eq(1);
        })

        it("Getting admin of the contract", async()=>{
            expect(await nft.getAdmin()).to.be.eq(owner.address);
        })
        it("Checking support for interface",async()=>{
            expect(await nft.supportsInterface("0x80ac58cd"));
        })


    })

            describe("Test cases for carbon units contract",async()=>{
            it("Getting name, symbol and decimals of the contract",async()=>{
                 expect(await token.name()).to.be.eq("ZeroCarbon Token");
                 expect (await token.symbol()).to.be.eq("ZCU");
                 expect(await token.decimals()).to.be.eq(0);
            })

            it("Getting total supply of the token",async()=>{
                const seller = await new CarbonCreditParcel({
                    _contract: exchange,
                    _signer : owner
                })
                const parcel = await seller.createParcel(
                    owner.address,
                    1,
                    15,
                    expandTo6Decimals(10),
                    1788309246,
                    "Sample"
                );
                await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
                await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(102))
                await exchange.connect(signer[1]).buyNFT(parcel,10,true,usdt.address,1);
                expect(await token.totalSupply()).to.be.eq(10);
            })

            it("Transfer function testing",async()=>{
                const seller = await new CarbonCreditParcel({
                    _contract: exchange,
                    _signer : owner
                })
                const parcel = await seller.createParcel(
                    owner.address,
                    1,
                    15,
                    expandTo6Decimals(10),
                    1788309246,
                    "Sample"
                );
                await usdt.connect(owner).approve(exchange.address,expandTo6Decimals(102))
                await exchange.connect(owner).buyNFT(parcel,10,true,usdt.address,1);
                await token.connect(owner).transfer(signer[1].address,5);
                expect(await token.balanceOf(signer[1].address)).to.be.eq(5);
            })

            it("Increase and decrease allowance testing",async()=>{
                const seller = await new CarbonCreditParcel({
                    _contract: exchange,
                    _signer : owner
                })
                const parcel = await seller.createParcel(
                    owner.address,
                    1,
                    15,
                    expandTo6Decimals(10),
                    1988309246,
                    "Sample"
                );
                await usdt.connect(owner).approve(exchange.address,expandTo6Decimals(102))
                await exchange.connect(owner).buyNFT(parcel,10,true,usdt.address,1);
                expect(await token.allowance(owner.address,signer[1].address)).to.be.eq(0);
                await token.connect(owner).approve(signer[1].address,1);
                expect(await token.allowance(owner.address,signer[1].address)).to.be.eq(10);
                await token.connect(owner).increaseAllowance(signer[1].address,3);
                expect(await token.allowance(owner.address,signer[1].address)).to.be.eq(13);
                await token.connect(owner).decreaseAllowance(signer[1].address,2);   
                expect(await token.allowance(owner.address,signer[1].address)).to.be.eq(11);
            })

            describe("Negative test cases for Carbon units contract",async()=>{
                it("Mint function called by a non-verified address",async()=>{
                    await expect( token.connect(signer[1]).mint(signer[1].address,2,198830924)).of.be.revertedWith("Identity not verified.")
                })
                it("Calling Mint function by other than NFT contract",async()=>{
                    const seller = await new CarbonCreditParcel({
                        _contract: exchange,
                        _signer : owner
                    })
                    const parcel = await seller.createParcel(
                        owner.address,
                        1,
                        15,
                        expandTo6Decimals(10),
                        1788309246,
                        "Sample"
                    );
                    await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
                    await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(102))
                    await exchange.connect(signer[1]).buyNFT(parcel,10,true,usdt.address,1);

                   await expect(token.connect(signer[1]).mint(signer[1].address,5,1988309246)).to.be.revertedWith("Call only allowed by the ZeroCarbonNFT");
                })
                it("calling Transfer function from a non-admin account testing",async()=>{
                    const seller = await new CarbonCreditParcel({
                        _contract: exchange,
                        _signer : owner
                    })
                    const parcel = await seller.createParcel(
                        owner.address,
                        1,
                        15,
                        expandTo6Decimals(10),
                        1788309246,
                        "Sample"
                    );
                    await usdt.connect(owner).approve(exchange.address,expandTo6Decimals(102))
                    await exchange.connect(owner).buyNFT(parcel,10,true,usdt.address,1);
                    await expect(token.connect(signer[1]).transfer(signer[3].address,5)).to.be.revertedWith("You are not the admin.");
                   
                })
    
                it(" decreasing allowance below zero testing",async()=>{
                    const seller = await new CarbonCreditParcel({
                        _contract: exchange,
                        _signer : owner
                    })
                    const parcel = await seller.createParcel(
                        owner.address,
                        1,
                        15,
                        expandTo6Decimals(10),
                        1988309246,
                        "Sample"
                    );
                    await usdt.connect(owner).approve(exchange.address,expandTo6Decimals(102))
                    await exchange.connect(owner).buyNFT(parcel,10,true,usdt.address,1);
                    expect(await token.allowance(owner.address,signer[1].address)).to.be.eq(0);
                    await token.connect(owner).approve(signer[1].address,1);
                    await expect(token.connect(owner).decreaseAllowance(signer[1].address,16)).to.be.revertedWith("ERC20: decreased allowance below zero");   
                })
                it("Calling approve funtion for expired credits",async()=>{
                    const seller = await new CarbonCreditParcel({
                        _contract: exchange,
                        _signer : owner
                    })
                    const parcel = await seller.createParcel(
                        owner.address,
                        1,
                        15,
                        expandTo6Decimals(10),
                        1788309246,
                        "Sample"
                    );
                    await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
                    await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(102))
                    await exchange.connect(signer[1]).buyNFT(parcel,10,true,usdt.address,1);
                    
                    await time.increaseTo(1788309346)

                    await expect(token.connect(signer[1]).approve(signer[2].address,1)).to.be.revertedWith("Carbon credits are expired.");
                })

                it("Negative cases for transferfrom function",async()=>{
                    await expect( token.connect(signer[1]).transferFrom(owner.address,1,signer[2].address,3)).of.be.revertedWith("Identity of receiver is not verified.");

                    const seller = await new CarbonCreditParcel({
                        _contract: exchange,
                        _signer : owner
                    })
                    const parcel = await seller.createParcel(
                        owner.address,
                        1,
                        15,
                        expandTo6Decimals(10),
                        1888309246,
                        "Sample"
                    );
                    await usdt.connect(owner).mint(signer[1].address, expandTo6Decimals(1000));
                    await usdt.connect(signer[1]).approve(exchange.address,expandTo6Decimals(102))
                    await usdt.connect(owner).mint(signer[2].address, expandTo6Decimals(1000));
                    await usdt.connect(signer[2]).approve(exchange.address,expandTo6Decimals(102));
                    await usdt.connect(owner).mint(signer[3].address, expandTo6Decimals(1000));
                    await usdt.connect(signer[3]).approve(exchange.address,expandTo6Decimals(102));
                    await exchange.connect(signer[1]).buyNFT(parcel,10,true,usdt.address,1);
                    await exchange.connect(signer[2]).buyNFT(parcel,4,true,usdt.address,1);
                    await exchange.connect(signer[3]).buyNFT(parcel,1,true,usdt.address,1);
                    await expect(token.connect(signer[1]).approve(signer[2].address,1));
                    await token.connect(signer[3]).approve(signer[1].address,1)
                    await expect(token.connect(signer[1]).transferFrom(signer[3].address,1,signer[1].address,3)).to.be.revertedWith("Not enough amount in the package.");
                    await expect(token.connect(signer[1]).transferFrom(signer[2].address,1,signer[1].address,3)).to.be.revertedWith("Not allowed to take action on the carbon units");
                    await time.increaseTo(1888309346);
                    await expect(token.connect(signer[1]).transferFrom(signer[2].address,1,signer[1].address,3)).to.be.revertedWith("Carbon credits are expired.");
                    
                })

                it("Insufficient balance, Zero address from and to testing for _transfer",async()=>{
                    const seller = await new CarbonCreditParcel({
                        _contract: exchange,
                        _signer : owner
                    })
                    const parcel = await seller.createParcel(
                        owner.address,
                        1,
                        15,
                        expandTo6Decimals(10),
                        1888409346,
                        "Sample"
                    );
                    await usdt.connect(owner).approve(exchange.address,expandTo6Decimals(102))
                    await exchange.connect(owner).buyNFT(parcel,10,true,usdt.address,1);
                    await token.connect(owner).approve(signer[2].address,1)
                    // await expect(token.connect(address0).transfer(signer[1].address,5)).to.be.revertedWith("ERC20: transfer from the zero address");
                    await expect(token.connect(owner).transfer(address0,5)).to.be.revertedWith("ERC20: transfer to the zero address");
                    await expect(token.connect(owner).transfer(signer[1].address,50)).to.be.revertedWith("ERC20: transfer amount exceeds balance");

                })

                it("Approving from and to zero address",async()=>{
                    const seller = await new CarbonCreditParcel({
                        _contract: exchange,
                        _signer : owner
                    })
                    const parcel = await seller.createParcel(
                        owner.address,
                        1,
                        15,
                        expandTo6Decimals(10),
                        1888409346,
                        "Sample"
                    );
                    await usdt.connect(owner).approve(exchange.address,expandTo6Decimals(102))
                    await exchange.connect(owner).buyNFT(parcel,10,true,usdt.address,1);
                    await expect(token.connect(owner).approve(address0,1)).to.be.revertedWith("ERC20: approve to the zero address");
                    // await expect(token.connect(address0).approve(owner.address,1)).to.be.revertedWith("ERC20: approve from the zero address");
                })


            })
        })

})