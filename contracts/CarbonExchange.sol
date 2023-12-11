// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./library/Credit.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "hardhat/console.sol";
import "contracts/interface/ICarbonCredit.sol";
import "contracts/interface/ICarbonUnits.sol";
import "contracts/interface/IIdentityFactory.sol";

contract CarbonExchange is
    Ownable,
    Initializable,
    EIP712Upgradeable,
    ReentrancyGuardUpgradeable
{
    address public admin;

    address public carbonCreditNFT;

    uint96 public platformFeePercent; // in BP 10000.

    address public tether;

    address identityFactory;

    struct CarbonUnitsLeftInNFT {
        uint256 totalCarbonUnits;
        uint256 CarbonUnitsLeft;
    }

    struct PerSale {
        address seller;
        uint tokenId;
        uint noCarbonUnits;
        address currency;
        uint amount;
        uint sellerShare;
    }

    struct SaleReceipt {
        uint totalTransactions;
        mapping(uint => PerSale) receiptPerTransaction;
    }

    struct SellerReceipt {
        address currencyAddress;
        uint amount;
    }

    mapping(address => mapping(uint256 => bool)) public nftMinted;

    mapping(address => mapping(uint256 => CarbonUnitsLeftInNFT))
        public carbonUnitsNFT;

    mapping(address => bool) public allowedCurrencies;

    mapping(address => SaleReceipt) public SaleReceiptForBuyer;

    mapping(address => mapping(uint => SellerReceipt)) public SellerAmounts;

    mapping(address => mapping(uint => bool)) public refundEnabled;

    mapping(address => uint) public platformCollection;

    mapping(address => bool) public identityRegistered;

    modifier onlyAdmin() {
        require(msg.sender == admin, "You are not the admin.");
        _;
    }

    function initialize(
        address _admin,
        uint96 _platformFeePercent,
        address _tether,
        address _carbonCreditNFT,
        address _identityFactory
    ) external initializer {
        require(_admin != address(0), "Zero address for Admin");
        require(_tether != address(0), "Zero address for tether");
        __EIP712_init_unchained("Zero_Carbon", "1");
        admin = _admin;
        platformFeePercent = _platformFeePercent;
        tether = _tether;
        carbonCreditNFT = _carbonCreditNFT;
        identityFactory = _identityFactory;
        allowedCurrencies[tether] = true;
    }

    function hashParcel(
        Credit.CarbonCreditParcel memory parcel
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "CarbonCreditParcel(address seller,uint256 tokenId,uint256 maxCarbonUnits,uint256 pricePerCarbonUnit,uint256 timePeriod,string tokenURI)"
                        ),
                        parcel.seller,
                        parcel.tokenId,
                        parcel.maxCarbonUnits,
                        parcel.pricePerCarbonUnit,
                        parcel.timePeriod,
                        keccak256(bytes(parcel.tokenURI))
                    )
                )
            );
    }

    function verifyParcel(
        Credit.CarbonCreditParcel memory parcel
    ) public view returns (address) {
        bytes32 digest = hashParcel(parcel);
        return ECDSAUpgradeable.recover(digest, parcel.signature);
    }

    function parcelOwner(
        Credit.CarbonCreditParcel memory parcel
    ) public pure returns (address) {
        return parcel.seller;
    }

    function buyNFT(
        Credit.CarbonCreditParcel memory parcel,
        uint256 _noCarbonUnits,
        bool isPrimary,
        address _currency,
        uint16 _countryCode
    ) external payable nonReentrant returns (address) {
        address sellerAddress = verifyParcel(parcel);
        require(parcel.timePeriod > block.timestamp, "Invalid Time period.");
        require(sellerAddress == parcel.seller, "Invalid seller.");
        if (!identityRegistered[msg.sender]) {
            registerIdentity(_countryCode);
            identityRegistered[msg.sender] = true;
        }
        if (isPrimary) {
            uint amount = calculateTotalAmount(parcel, _noCarbonUnits);

            if (_currency == address(1)) {
                require(msg.value >= amount, "Invalid amount.");
                saleTransaction(
                    parcel.seller,
                    parcel.tokenId,
                    _noCarbonUnits,
                    amount,
                    (parcel.pricePerCarbonUnit) * _noCarbonUnits,
                    _currency
                );
                if (msg.value > amount) {
                    (bool sent, ) = payable(msg.sender).call{
                        value: msg.value - amount
                    }("");
                }
            } else {
                require(allowedCurrencies[_currency], "Currency not allowed.");
                saleTransaction(
                    parcel.seller,
                    parcel.tokenId,
                    _noCarbonUnits,
                    amount,
                    (parcel.pricePerCarbonUnit) * _noCarbonUnits,
                    _currency
                );
            }

            ICarbonCredit(carbonCreditNFT).MintNft(
                msg.sender,
                parcel.tokenId,
                parcel.tokenURI,
                parcel.maxCarbonUnits,
                _noCarbonUnits,
                parcel.timePeriod
            );
            platformCollection[_currency] +=
                (platformFeePercent *
                    parcel.pricePerCarbonUnit *
                    _noCarbonUnits) /
                10000;
        } else {
            require(
                ICarbonCredit(carbonCreditNFT).checkExist(parcel.tokenId),
                "NFT does not exist."
            );

            uint amount = calculateTotalAmount(parcel, _noCarbonUnits);

            if (_currency == address(1)) {
                require(msg.value >= amount, "Invalid amount.");

                (bool sentToSeller, ) = payable(parcel.seller).call{
                    value: parcel.pricePerCarbonUnit * _noCarbonUnits
                }("");

                platformCollection[_currency] +=
                    (platformFeePercent *
                        parcel.pricePerCarbonUnit *
                        _noCarbonUnits) /
                    10000;

                require(sentToSeller, "Ether transfer failed to seller.");

                if (msg.value > amount) {
                    (bool sent, ) = payable(msg.sender).call{
                        value: msg.value - amount
                    }("");

                    require(sent, "Ether transfer failed.");
                }
            } else {
                require(allowedCurrencies[_currency], "Invalid currency");
                IERC20(_currency).transferFrom(
                    msg.sender,
                    parcel.seller,
                    parcel.pricePerCarbonUnit * _noCarbonUnits
                );
                IERC20(_currency).transferFrom(
                    msg.sender,
                    address(this),
                    (platformFeePercent *
                        parcel.pricePerCarbonUnit *
                        _noCarbonUnits) / 10000
                );
                platformCollection[_currency] +=
                    (platformFeePercent *
                        parcel.pricePerCarbonUnit *
                        _noCarbonUnits) /
                    10000;
            }

            ICarbonUnits(ICarbonCredit(carbonCreditNFT).addressCarbonUnits())
                .transferFrom(parcel.seller, 1, msg.sender, _noCarbonUnits);
        }
    }

    function issueNFT(
                Credit.CarbonCreditParcel memory parcel,
                uint256 _noCarbonUnits,
                bool _isPrimary,
                address _to,
                uint16 _countryCode
            ) external onlyAdmin{
                address sellerAddress = verifyParcel(parcel);
                require(parcel.timePeriod > block.timestamp, "Invalid Time period.");
                require(sellerAddress == parcel.seller, "Invalid seller.");
                if (!identityRegistered[_to]) {
                    registerIdentity(_countryCode);
                identityRegistered[_to] = true;
                    }
            
            if (_isPrimary) {
            ICarbonCredit(carbonCreditNFT).MintNft(
                _to,
                parcel.tokenId,
                parcel.tokenURI,
                parcel.maxCarbonUnits,
                _noCarbonUnits,
                parcel.timePeriod
            );
        }
        else{
            require(false,"Not allowed!");
        }        
            }


    function updatePlatformFeePercent(uint96 _newPlatformFee) external onlyAdmin {
        platformFeePercent = _newPlatformFee;
    }

    function updateAdmin(address _newAdmin) external onlyAdmin {
        admin = _newAdmin;
    }

    function updateCarbonCredit(address _cc) external onlyAdmin {
        carbonCreditNFT = _cc;
    }

    function registerIdentity(uint16 _countryCode) internal returns (address) {
        return
            IIdentityFactory(identityFactory).createAndRegisterIdentity(
                msg.sender,
                _countryCode
            );
    }

    function calculateTotalAmount(
        Credit.CarbonCreditParcel memory parcel,
        uint256 _noCarbonUnits
    ) public view returns (uint256) {
        uint platformAmount = (platformFeePercent *
            parcel.pricePerCarbonUnit *
            _noCarbonUnits) / 10000;
        uint totalAmount = platformAmount +
            (parcel.pricePerCarbonUnit) *
            _noCarbonUnits;
        return (totalAmount);
    }

    function saleTransaction(
        address _seller,
        uint _tokenId,
        uint _noCarbonUnits,
        uint _totalAmount,
        uint _sellerAmount,
        address _currencyAddress
    ) internal {
        SaleReceipt storage saleReceipt = SaleReceiptForBuyer[msg.sender];
            if (_currencyAddress == address(1)) {
                (bool sentToSeller, ) = payable(_seller).call{
                    value: _sellerAmount
                }("");
                require(sentToSeller, "Ether transfer failed to seller.");
            } else {
                IERC20(_currencyAddress).transferFrom(
                    msg.sender,
                    _seller,
                    _sellerAmount
                );
                IERC20(_currencyAddress).transferFrom(
                    msg.sender,
                    address(this),
                    _totalAmount - _sellerAmount
                );
            }
        saleReceipt.totalTransactions++;
        PerSale storage perSale = saleReceipt.receiptPerTransaction[
            saleReceipt.totalTransactions
        ];
        perSale.seller = _seller;
        perSale.tokenId = _tokenId;
        perSale.noCarbonUnits = _noCarbonUnits;
        perSale.currency = _currencyAddress;
        perSale.amount = _totalAmount;
        perSale.sellerShare = _sellerAmount;
    }

    function viewSaleReceipt(
        address _address,
        uint _transactionNo
    ) external view returns (PerSale memory) {
        return
            SaleReceiptForBuyer[_address].receiptPerTransaction[_transactionNo];
    }

    function withdrawPlatformAmount(
        address _currency
    ) external onlyAdmin nonReentrant {
        if (_currency == address(1)) {
            uint amount = address(this).balance;
            (bool sent, ) = payable(msg.sender).call{value: amount}("");
            require(sent);
        } else {
            require(allowedCurrencies[_currency], "Currency not allowed!");
            uint amount = IERC20(_currency).balanceOf(address(this));
            IERC20(_currency).transfer(msg.sender, amount);
        }
    }

}
