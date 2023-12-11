//SPDX-License-Identifier: UNLICENSED

pragma solidity >= 0.8.17;

interface IIdentityFactory {

    function createAndRegisterIdentity(address _address, uint16 _countryCode) external returns(address);

}