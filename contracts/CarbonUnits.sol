// SPDX-License-Identifier: MIT

pragma solidity >=0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "contracts/KYC Module/interface/IIdentityRegistry.sol";
import "hardhat/console.sol";

contract ZeroCarbonUnitToken is Context, Initializable {
    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    mapping(address => mapping(address => mapping(uint => bool)))
        private _allowancePerTx;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;
    uint8 private _decimals;
    address public identityRegistry;
    address public zeroCarbonNFT;

    address public admin;

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    struct CarbonUnitsTransactions {
        uint256 txId;
        mapping(uint256 => CarbonUnitsHistory) CarbonHistoryPerTx;
    }

    struct CarbonUnitsHistory {
        uint256 amount;
        uint256 expirationPeriod;
    }

    mapping(address => CarbonUnitsTransactions) public carbonHistory;

    modifier onlyAdmin() {
        require(msg.sender == admin, "You are not the admin.");
        _;
    }

    function init(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address _collectionAddress,
        address _identityRegistry,
        address _admin
    ) external initializer {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        identityRegistry = _identityRegistry;
        zeroCarbonNFT = _collectionAddress;
        admin = _admin;
    }

    function verified(address _to) public view returns (bool) {
        return IIdentityRegistry(identityRegistry).isVerified(_to);
    }

    function mint(
        address _to,
        uint256 _amount,
        uint _expirationPeriod
    ) external {
        require(verified(_to), "Identity not verified.");
        require(
            msg.sender == zeroCarbonNFT,
            "Call only allowed by the ZeroCarbonNFT"
        );
        _mint(_to, _amount);
        registerCarbonUnits(_to, _amount, _expirationPeriod);
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    function transfer(
        address to,
        uint256 amount
    ) public virtual onlyAdmin returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function allowancePerTx(
        address owner,
        address spender,
        uint256 txId
    ) public view virtual returns (bool) {
        return _allowancePerTx[owner][spender][txId];
    }

    function approve(
        address spender,
        uint256 referenceTxId
    ) public virtual returns (bool) {
        require(
            carbonHistory[msg.sender]
                .CarbonHistoryPerTx[referenceTxId]
                .expirationPeriod > block.timestamp,
            "Carbon credits are expired."
        );
        address owner = _msgSender();
        uint amount = carbonHistory[msg.sender]
            .CarbonHistoryPerTx[referenceTxId]
            .amount;
        _allowancePerTx[msg.sender][spender][referenceTxId] = true;
        _approve(owner, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        uint referenceTxId,
        address to,
        uint amount
    ) public virtual returns (bool) {
        require(
            IIdentityRegistry(identityRegistry).isVerified(to),
            "Identity of receiver is not verified."
        );
        require(
            carbonHistory[from]
                .CarbonHistoryPerTx[referenceTxId]
                .expirationPeriod > block.timestamp,
            "Carbon credits are expired."
        );
        require(
            _allowancePerTx[from][msg.sender][referenceTxId] == true,
            "Not allowed to take action on the carbon units"
        );
        address spender = _msgSender();
        uint amountIn = carbonHistory[from]
            .CarbonHistoryPerTx[referenceTxId]
            .amount;
        require(amount <= amountIn, "Not enough amount in the package.");
        uint expirationPeriod = carbonHistory[from]
            .CarbonHistoryPerTx[referenceTxId]
            .expirationPeriod;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        registerCarbonUnits(to, amount, expirationPeriod);
        deRegisterCarbonUnits(from, amount, referenceTxId);
        _allowancePerTx[from][msg.sender][referenceTxId] = false;
        return true;
    }

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, allowance(owner, spender) + addedValue);
        return true;
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public virtual returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = allowance(owner, spender);
        require(
            currentAllowance >= subtractedValue,
            "ERC20: decreased allowance below zero"
        );
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        // require(_beforeTokenTransfer(from, to, amount),"Identity not verified");

        uint256 fromBalance = _balances[from];
        require(
            fromBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );
        unchecked {
            _balances[from] = fromBalance - amount;
        }
        _balances[to] += amount;

        emit Transfer(from, to, amount);

        _afterTokenTransfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");
        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    // function _burn(address account, uint256 amount) internal virtual {
    //     require(account != address(0), "ERC20: burn from the zero address");

    //     // _beforeTokenTransfer(account, address(0), amount);

    //     uint256 accountBalance = _balances[account];
    //     require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
    //     unchecked {
    //         _balances[account] = accountBalance - amount;
    //     }
    //     _totalSupply -= amount;

    //     emit Transfer(account, address(0), amount);

    //     _afterTokenTransfer(account, address(0), amount);
    // }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(
                currentAllowance >= amount,
                "ERC20: insufficient allowance"
            );
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function registerCarbonUnits(
        address _to,
        uint256 _amount,
        uint256 _expirationPeriod
    ) internal {
        carbonHistory[_to].txId++;
        carbonHistory[_to]
            .CarbonHistoryPerTx[carbonHistory[_to].txId]
            .amount = _amount;
        carbonHistory[_to]
            .CarbonHistoryPerTx[carbonHistory[_to].txId]
            .expirationPeriod = _expirationPeriod;
    }

    function deRegisterCarbonUnits(
        address _to,
        uint256 _amount,
        uint256 referenceTxId
    ) internal {
        carbonHistory[_to].CarbonHistoryPerTx[referenceTxId].amount -= _amount;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual returns (bool) {}

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
