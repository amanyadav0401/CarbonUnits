// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "contracts/KYC Module/interface/IIdentityRegistry.sol";
import "contracts/KYC Module/interface/IId.sol";
import "contracts/KYC Module/interface/IIdentity.sol";

contract IdentityFactory is Initializable{

    address public identityTemplate;
    address public admin;
    address public identityRegistry;
    uint public totalIdentitiesDeployed;

    mapping(address=>address) public identityAddress;

    modifier onlyAdmin() {
        require(msg.sender==admin);
        _;
    }

    function init(address _identityTemplate, address _identityRegistry, address _admin) external initializer {
        identityTemplate = _identityTemplate;
        identityRegistry = _identityRegistry;
        admin = _admin;
    }

    function createAndRegisterIdentity(address _address, uint16 _countryCode) external returns(address){
        require(identityAddress[_address]==address(0),"Already registered!");
        totalIdentitiesDeployed++;
        bytes32 salt = keccak256(abi.encodePacked(totalIdentitiesDeployed, _address, identityTemplate, _countryCode));
        address identity = ClonesUpgradeable.cloneDeterministic(identityTemplate, salt);
        identityAddress[_address] = identity;
        IID(identity).init(_address, false);
        IIdentityRegistry(identityRegistry).registerIdentity(_address,IIdentity(identity), _countryCode);
        return identity;    
    }

    function revokeIdentity(address _userAddress) external onlyAdmin {
        IIdentityRegistry(identityRegistry).deleteIdentity(_userAddress);
    }

    function updateAdmin(address _admin) external onlyAdmin{
        admin = _admin;
    }

    function updateTemplate(address _template) external onlyAdmin {
        identityTemplate = _template;
    }

    function updateRegistry(address _registry) external onlyAdmin {
        identityRegistry = _registry;
    }

}