//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

interface ICarbonCredit {

    function MintNft(address _to, 
    uint _tokenId,
    string memory _tokenURI,
    uint256 _maxCarbonUnits, 
    uint256 _noCarbonUnits, 
    uint256 _expirationPeriod) external;

    function checkExist(uint _tokenId) external view returns(bool);

    function addressCarbonUnits() external view returns(address);

}
