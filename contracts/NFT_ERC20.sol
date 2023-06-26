// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
//import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
//import "@openzeppelin/contracts-upgradeable/proxy/ERC1967/UUPSUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
//import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
 import "./IERC20Permit.sol";		

//pragma solidity 0.8.18;

//import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
//import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
//import "@openzeppelin/contracts/security/Pausable.sol";
//import "@openzeppelin/contracts/access/Ownable.sol";
//import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
//import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


contract NFTDutchAuction_ERC20Bids is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    //address private owner;
    IERC721 public nfterc721Reference;
    IERC20Permit public erc20TokenReference;
    uint256 public nftTokenId;
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;
    uint256 public startAtBlockNumber;
    uint256 public endsAtBlockNumber;
    uint256 public initialPrice;
    uint256 public finalPrice;
    mapping(address => uint256) public bidderTokens;
    address[] public bidders;
    uint256 public totalBidTokens;
    bool public auctionEnded;
    string public upgradeNumber;

    function initialize(
        string memory _upgradeNumber,
        address erc20TokenAddress,
        address erc721TokenAddress,
        uint256 _nftTokenId,
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        upgradeNumber = _upgradeNumber;
        _transferOwnership(msg.sender);
        nfterc721Reference = IERC721(erc721TokenAddress);
        erc20TokenReference = IERC20Permit(erc20TokenAddress);
        nftTokenId = _nftTokenId;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;

        startAtBlockNumber = block.number;
        endsAtBlockNumber = startAtBlockNumber + numBlocksAuctionOpen;
        initialPrice = reservePrice + (numBlocksAuctionOpen * offerPriceDecrement - 1);
        auctionEnded = false;
    
    }

 function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}


    function getCurrentPrice() public view returns (uint256) {
        uint256 blocks = block.number - startAtBlockNumber;
        if (blocks >= numBlocksAuctionOpen) {
            return reservePrice;
        } else {
            return initialPrice - (blocks * offerPriceDecrement);
        }
    }

    function bid(uint256 bidAmount) external returns (address) {
        require(!auctionEnded, "Auction has already ended");
        if ((block.number - startAtBlockNumber) > numBlocksAuctionOpen) {
            auctionEnded = true;
        }

        require((block.number - startAtBlockNumber) <= numBlocksAuctionOpen, "Auction Ended");

        uint256 blocks = block.number - startAtBlockNumber;
        uint256 currentPrice = initialPrice - (blocks * offerPriceDecrement - 1);

        require(bidAmount >= currentPrice, "The bid amount sent is too low");

        require(
            bidAmount <= erc20TokenReference.allowance(msg.sender, address(this)),
            "Bid amount accepted, but bid failed because not enough balance to transfer erc20 token"
        );

        nfterc721Reference.transferFrom(owner(), msg.sender, nftTokenId);
        erc20TokenReference.transferFrom(msg.sender, owner(), bidAmount);
        auctionEnded = true;
        return msg.sender;
    }
    function getMessage() public view returns (string memory) {
        return upgradeNumber;
    }

    function bidvrs(uint256 amount, bool isOffChain, uint8 v, bytes32 r, bytes32 s, uint256 deadline)
    public 
    payable
    {
        require(auctionEnded == false, "Auction has already ended!");
        require((block.number - startAtBlockNumber) <= numBlocksAuctionOpen, "Auction Ended");
        uint256 blocks = block.number - startAtBlockNumber;
        uint256 currentPrice = initialPrice - (blocks * offerPriceDecrement - 1);
        require(amount >= currentPrice, "The bid amount sent is too low");
        finalize(amount, isOffChain, v, r, s, deadline);
    }

    function finalize(uint256 amount, bool isOffChain, uint8 v, bytes32 r, bytes32 s, uint256 deadline) 
    internal 
    {
        require(erc20TokenReference.allowance(msg.sender, address(this)) >= amount, "Insufficient Token Allowance.");
        require(erc20TokenReference.balanceOf(msg.sender) >= amount, "Not enough balance in the wallet.");
        erc20TokenReference.transferFrom(msg.sender, owner(), amount);
        nfterc721Reference.safeTransferFrom(owner(), msg.sender, nftTokenId);
        auctionEnded = true;
    }
}

