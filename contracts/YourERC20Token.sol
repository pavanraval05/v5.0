pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YourERC20Token is ERC20, ERC20Permit, Ownable {
    constructor() ERC20("Dutch Auction fungibleToken", "PAV20")  ERC20Permit("Dutch Auction fungibleToken")
        {
        _mint(msg.sender, 1000000);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
